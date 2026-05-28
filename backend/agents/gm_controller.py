from __future__ import annotations

from typing import Any

from game_state import GameRoom, now_iso
from models import WSMessage
from room_manager import room_manager
from agents.action_parser import action_parser
from agents.action_recommender import action_recommender
from agents.gm_adjudicator import gm_adjudicator
from agents.npc_agent import npc_agent
from agents.observation_agent import observation_agent
from agents.story_director import story_director
from rules.rule_engine import rule_engine


class GMController:
    async def handle_role_selected(self, room: GameRoom) -> None:
        narration = await story_director.initial_push(room)
        if not narration:
            return
        room.public_log.append({"type": "narration", "at": now_iso(), "text": narration})
        await room_manager.broadcast(room.code, WSMessage(type="narration", payload={"text": narration}))
        await self._broadcast_state(room)

    async def handle_player_message(self, room: GameRoom, player_id: str, text: str) -> None:
        player = room.players[player_id]
        entry = {"type": "player_message", "at": now_iso(), "name": player.name, "text": text}
        room.public_log.append(entry)
        await room_manager.broadcast(room.code, WSMessage(type="player_message", payload=entry))

        if npc_agent.human_controlled_target(room, text):
            await self._broadcast_state(room)
            return

        if npc_agent.ai_controlled_target(room, text):
            npc = await npc_agent.react(room, text)
            room.public_log.append({"type": "npc_message", "at": now_iso(), "name": npc["name"], "text": npc["text"]})
            await room_manager.broadcast(room.code, WSMessage(type="npc_message", payload={"name": npc["name"], "text": npc["text"]}))
            await self._broadcast_events(room, npc.get("events", []))

            result = self._conversation_result(npc)
            gm_update = await story_director.advance_after_world_update(room, f"公开对话：{text}\n角色回应：{npc['text']}", result)
            if gm_update["narration"]:
                room.public_log.append({"type": "narration", "at": now_iso(), "text": gm_update["narration"]})
                await room_manager.broadcast(room.code, WSMessage(type="narration", payload={"text": gm_update["narration"]}))
            await self._broadcast_events(room, gm_update.get("events", []))

            if gm_update.get("chapter_text"):
                room.public_log.append({"type": "chapter_changed", "at": now_iso(), "text": gm_update["chapter_text"]})
                await room_manager.broadcast(
                    room.code,
                    WSMessage(
                        type="chapter_changed",
                        payload={"chapter": self._public_chapter(room), "text": gm_update["chapter_text"]},
                    ),
                )

            if gm_update.get("ending"):
                await room_manager.broadcast(room.code, WSMessage(type="game_ended", payload={"ending": gm_update["ending"]}))

            await self._broadcast_state(room)

    async def handle_action(self, room: GameRoom, player_id: str, text: str, is_public: bool = True) -> None:
        action = await action_parser.parse(player_id, text, is_public)
        player = room.players[player_id]

        if is_public and observation_agent.is_observation(action, text):
            result = self._observation_action_result()
            await self._publish_player_action(room, player.name, text, "观察", result)
            observation = await observation_agent.observe(room, text, action)
            entry = {"type": "observation", "at": now_iso(), "name": observation["subject"], "text": observation["text"]}
            room.public_log.append(entry)
            await room_manager.broadcast(room.code, WSMessage(type="observation", payload=entry))
            await self._broadcast_events(room, observation.get("events", []))
            await self._broadcast_state(room)
            return

        rule_result = rule_engine.evaluate(room, player_id, action)
        adjudication = await gm_adjudicator.adjudicate(room, player_id, text, is_public, action, rule_result)
        adjudication = story_director._enforce_progression_gates(room, adjudication)
        room.apply_world_state_changes(adjudication.world_state_changes, "AI GM")
        events = room.record_events(adjudication.triggered_events)
        chapter_text = story_director._maybe_advance_chapter(room, adjudication)
        ending = story_director._maybe_end_game(room, adjudication)
        result = {
            "outcome": adjudication.outcome,
            "score": rule_result.get("score", 1),
            "costs": rule_result.get("costs", []),
            "changes": rule_result.get("changes", {}),
            "ability_used": rule_result.get("ability_used"),
            "world_state_changes": [change.model_dump() for change in adjudication.world_state_changes],
            "public": is_public,
        }

        if is_public:
            await self._publish_player_action(room, player.name, text, adjudication.action_label, result)
        else:
            await self._send_private_action_result(room, player_id, text, adjudication.narration)

        private_hint = adjudication.private_hint or self._private_hint(result)
        if private_hint:
            room.private_messages[player_id].append({"type": "private_message", "at": now_iso(), "text": private_hint})
            await room_manager.send_private(
                room.code,
                player_id,
                WSMessage(type="private_message", payload={"text": private_hint}),
            )

        if is_public and adjudication.narration:
            room.public_log.append({"type": "narration", "at": now_iso(), "text": adjudication.narration})
            await room_manager.broadcast(room.code, WSMessage(type="narration", payload={"text": adjudication.narration}))

        npc_events: list[str] = []
        if is_public:
            emitted_names: set[str] = set()
            if npc_agent.ai_controlled_target(room, text, action):
                npc = await npc_agent.react(room, text, action)
                emitted_names.add(npc["name"])
                npc_events = npc.get("events", [])
                room.public_log.append({"type": "npc_message", "at": now_iso(), "name": npc["name"], "text": npc["text"]})
                await room_manager.broadcast(room.code, WSMessage(type="npc_message", payload={"name": npc["name"], "text": npc["text"]}))

            for reaction in adjudication.reactions:
                if reaction.name in emitted_names:
                    continue
                room.public_log.append({"type": "npc_message", "at": now_iso(), "name": reaction.name, "text": reaction.text})
                await room_manager.broadcast(room.code, WSMessage(type="npc_message", payload={"name": reaction.name, "text": reaction.text}))

        await self._broadcast_events(room, [*events, *npc_events] if is_public else [])

        if chapter_text:
            room.public_log.append({"type": "chapter_changed", "at": now_iso(), "text": chapter_text})
            await room_manager.broadcast(
                room.code,
                WSMessage(
                    type="chapter_changed",
                    payload={"chapter": self._public_chapter(room), "text": chapter_text},
                ),
            )

        if ending:
            await room_manager.broadcast(room.code, WSMessage(type="game_ended", payload={"ending": ending}))

        await self._broadcast_state(room)

    async def _publish_player_action(
        self,
        room: GameRoom,
        player_name: str,
        text: str,
        action_type: str,
        result: dict[str, Any],
    ) -> None:
        entry = {
            "type": "player_action",
            "at": now_iso(),
            "name": player_name,
            "text": text,
            "action_type": action_type,
            "outcome": result.get("outcome"),
        }
        room.public_log.append(entry)
        await room_manager.broadcast(room.code, WSMessage(type="player_action", payload=entry))

    async def _send_private_action_ack(self, room: GameRoom, player_id: str, text: str) -> None:
        private_entry = {"type": "private_action", "at": now_iso(), "text": f"你秘密提交：{text}"}
        room.private_messages[player_id].append(private_entry)
        await room_manager.send_private(
            room.code,
            player_id,
            WSMessage(type="private_message", payload={"text": f"GM已记录你的秘密行动：{text}"}),
        )

    async def _send_private_action_result(self, room: GameRoom, player_id: str, text: str, narration: str) -> None:
        private_entry = {"type": "private_action", "at": now_iso(), "text": f"你秘密提交：{text}"}
        room.private_messages[player_id].append(private_entry)
        detail = narration or f"GM已记录你的私密行动：{text}"
        await room_manager.send_private(
            room.code,
            player_id,
            WSMessage(type="private_message", payload={"text": detail}),
        )

    async def _broadcast_events(self, room: GameRoom, events: list[str]) -> None:
        for event in events:
            public_name = room.event_public_name(event)
            payload = {"name": public_name, "text": f"事件触发：{public_name}"}
            room.public_log.append({"type": "event_triggered", "at": now_iso(), "name": public_name, "text": payload["text"]})
            await room_manager.broadcast(room.code, WSMessage(type="event_triggered", payload=payload))

    async def _broadcast_state(self, room: GameRoom) -> None:
        await self._refresh_recommendations(room)
        await room_manager.broadcast(
            room.code,
            WSMessage(
                type="state_update",
                payload={
                    "world_state": room.public_world_state(),
                    "current_chapter_id": room.current_chapter_id,
                    "current_chapter": self._public_chapter(room),
                    "triggered_events": room.triggered_events[-20:],
                    "ended": room.ended,
                    "ending": room.ending,
                },
            ),
        )
        for player_id in room.players:
            await room_manager.send_private(
                room.code,
                player_id,
                WSMessage(type="state_update", payload={"recommended_actions": room.recommended_actions.get(player_id, [])}),
            )

    async def _refresh_recommendations(self, room: GameRoom) -> None:
        for player_id, player in room.players.items():
            if not player.role_id:
                room.recommended_actions[player_id] = []
                continue
            room.recommended_actions[player_id] = await action_recommender.recommend(room, player_id)

    def _public_chapter(self, room: GameRoom) -> dict[str, str]:
        chapter = room.current_chapter()
        return {"id": chapter["id"], "title": chapter["title"], "opening": chapter["opening"]}

    def _observation_action_result(self) -> dict[str, Any]:
        return {
            "outcome": "成功",
            "score": 1,
            "costs": [],
            "changes": {},
            "ability_used": None,
            "observation_only": True,
            "world_state_changes": [],
            "public": True,
        }

    def _human_target_action_result(self, role: dict[str, Any]) -> dict[str, Any]:
        return {
            "outcome": "等待玩家回应",
            "score": 0,
            "costs": [],
            "changes": {},
            "ability_used": None,
            "human_target_role": role.get("name"),
            "world_state_changes": [],
            "public": True,
        }

    def _conversation_result(self, npc: dict[str, Any]) -> dict[str, Any]:
        return {
            "outcome": "角色已回应",
            "score": 1,
            "costs": [],
            "changes": {"dialogue_response": npc.get("name")},
            "ability_used": None,
            "world_state_changes": [],
            "public": True,
        }

    def _private_hint(self, result: dict[str, Any]) -> str | None:
        if result.get("ability_used"):
            return f"能力触发：{result['ability_used']}。你的角色特长让这次行动获得额外进展。"
        if result.get("observation_only"):
            return None
        if result["outcome"] == "成功":
            return "你的行动取得实质进展。GM暗示：你可以继续围绕同一线索施压。"
        if result["costs"]:
            return "代价提示：" + "；".join(result["costs"])
        return None


gm_controller = GMController()
