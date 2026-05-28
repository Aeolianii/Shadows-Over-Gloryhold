from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from ai_client import ai_client
from agents.action_recommender import action_recommender
from agents.gm_controller import gm_controller
from models import CreateRoomRequest, JoinRoomRequest, SelectRoleRequest, WSMessage
from room_manager import room_manager
from story_loader import list_stories


logger = logging.getLogger(__name__)

app = FastAPI(title="Agent-Driven Interactive Story Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_ai_client() -> None:
    await ai_client.close()


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/stories")
def stories() -> list[dict]:
    return list_stories()


@app.post("/api/rooms")
def create_room(req: CreateRoomRequest) -> dict:
    try:
        room = room_manager.create_room(req.story_id)
        player = room.add_player(req.player_name)
        return {"room": room.player_view(player.id), "player": player.model_dump()}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.get("/api/rooms/{room_code}")
def get_room(room_code: str) -> dict:
    try:
        return room_manager.get_room(room_code).public_room()
    except KeyError:
        raise HTTPException(status_code=404, detail="Room not found")


@app.post("/api/rooms/{room_code}/join")
def join_room(room_code: str, req: JoinRoomRequest) -> dict:
    try:
        room = room_manager.get_room(room_code)
    except KeyError:
        raise HTTPException(status_code=404, detail="Room not found")
    if len(room.players) >= room.story["max_players"]:
        raise HTTPException(status_code=400, detail="Room is full")
    player = room.add_player(req.player_name)
    return {"room": room.player_view(player.id), "player": player.model_dump()}


@app.post("/api/rooms/{room_code}/select-role")
async def select_role(room_code: str, req: SelectRoleRequest) -> dict:
    try:
        room = room_manager.get_room(room_code)
        if req.player_id not in room.players:
            raise HTTPException(status_code=404, detail="Player not found")
        room.select_role(req.player_id, req.role_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Room not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    await room_manager.broadcast(
        room.code,
        WSMessage(
            type="state_update",
            payload={
                "world_state": room.public_world_state(),
                "current_chapter_id": room.current_chapter_id,
                "current_chapter": {
                    "id": room.current_chapter()["id"],
                    "title": room.current_chapter()["title"],
                    "opening": room.current_chapter()["opening"],
                },
            },
        ),
    )
    await gm_controller.handle_role_selected(room)
    return room.player_view(req.player_id)


@app.websocket("/ws/{room_code}/{player_id}")
async def websocket_endpoint(ws: WebSocket, room_code: str, player_id: str) -> None:
    try:
        room = room_manager.get_room(room_code)
    except KeyError:
        await ws.close(code=4404)
        return
    if player_id not in room.players:
        await ws.close(code=4403)
        return

    await room_manager.connect(room.code, player_id, ws)
    await room_manager.broadcast(
        room.code,
        WSMessage(type="system", payload={"text": f"{room.players[player_id].name} 已进入房间。"}),
    )
    await room_manager.send_private(
        room.code,
        player_id,
        WSMessage(type="state_update", payload=room.player_view(player_id)),
    )
    if room.players[player_id].role_id:
        room.recommended_actions[player_id] = await action_recommender.recommend(room, player_id)
        await room_manager.send_private(
            room.code,
            player_id,
            WSMessage(type="state_update", payload={"recommended_actions": room.recommended_actions[player_id]}),
        )

    try:
        while True:
            raw = await ws.receive_json()
            try:
                msg = WSMessage(**raw)
                if room.ended:
                    if room.ending:
                        await room_manager.send_private(
                            room.code,
                            player_id,
                            WSMessage(type="game_ended", payload={"ending": room.ending}),
                        )
                    await room_manager.send_private(
                        room.code,
                        player_id,
                        WSMessage(type="private_message", payload={"text": "游戏已结束。"}),
                    )
                    continue
                if msg.type == "player_message":
                    await gm_controller.handle_player_message(room, player_id, str(msg.payload.get("text", "")))
                elif msg.type == "player_action":
                    await gm_controller.handle_action(room, player_id, str(msg.payload.get("text", "")), True)
                elif msg.type == "private_action":
                    await gm_controller.handle_action(room, player_id, str(msg.payload.get("text", "")), False)
            except Exception as exc:
                logger.exception("Failed to handle websocket message")
                await room_manager.send_private(
                    room.code,
                    player_id,
                    WSMessage(
                        type="private_message",
                        payload={"text": f"GM处理这次行动时遇到异常，连接已保留，请重试。({exc.__class__.__name__})"},
                    ),
                )
                await room_manager.send_private(
                    room.code,
                    player_id,
                    WSMessage(type="state_update", payload=room.player_view(player_id)),
                )
    except WebSocketDisconnect:
        room_manager.disconnect(room.code, player_id)
        await room_manager.broadcast(
            room.code,
            WSMessage(type="system", payload={"text": f"{room.players[player_id].name} 离开了房间。"}),
        )
