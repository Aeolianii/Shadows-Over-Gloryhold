from __future__ import annotations

import random
import string
from typing import Any

from fastapi import WebSocket

from game_state import GameRoom
from models import WSMessage
from story_loader import load_story


class RoomManager:
    def __init__(self) -> None:
        self.rooms: dict[str, GameRoom] = {}
        self.connections: dict[str, dict[str, WebSocket]] = {}

    def create_room(self, story_id: str) -> GameRoom:
        code = self._new_code()
        self.rooms[code] = GameRoom(code, load_story(story_id))
        self.connections[code] = {}
        return self.rooms[code]

    def get_room(self, code: str) -> GameRoom:
        room = self.rooms.get(code.upper())
        if not room:
            raise KeyError("Room not found")
        return room

    async def connect(self, code: str, player_id: str, ws: WebSocket) -> None:
        await ws.accept()
        room = self.get_room(code)
        self.connections[room.code][player_id] = ws
        if player_id in room.players:
            room.players[player_id].connected = True

    def disconnect(self, code: str, player_id: str) -> None:
        room = self.rooms.get(code.upper())
        if not room:
            return
        self.connections.get(room.code, {}).pop(player_id, None)
        if player_id in room.players:
            room.players[player_id].connected = False

    async def broadcast(self, code: str, message: WSMessage) -> None:
        dead = []
        for player_id, ws in self.connections.get(code.upper(), {}).items():
            try:
                await ws.send_json(message.model_dump())
            except Exception:
                dead.append(player_id)
        for player_id in dead:
            self.disconnect(code, player_id)

    async def send_private(self, code: str, player_id: str, message: WSMessage) -> None:
        ws = self.connections.get(code.upper(), {}).get(player_id)
        if ws:
            await ws.send_json(message.model_dump())

    def _new_code(self) -> str:
        while True:
            code = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
            if code not in self.rooms:
                return code


room_manager = RoomManager()

