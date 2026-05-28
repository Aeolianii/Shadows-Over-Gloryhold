from __future__ import annotations

import hashlib
from typing import Any

from ai_client import ai_client
from game_state import GameRoom
from models import RecommendedAction


class ActionRecommender:
    async def recommend(self, room: GameRoom, player_id: str) -> list[dict[str, Any]]:
        player = room.players.get(player_id)
        if not player or room.ended:
            return []

        deterministic_actions = self._deterministic_actions(room)
        if deterministic_actions:
            return [action.model_dump() for action in self._normalize_actions(deterministic_actions, deterministic_actions)]

        fallback = {"actions": self._fallback_actions(room)}
        data = await ai_client.chat_json(
            self._system_prompt(),
            str(self._user_payload(room, player_id)),
            fallback,
            route="recommendation",
            temperature=0.35,
        )
        actions = self._normalize_actions(data.get("actions"), fallback["actions"])
        return [action.model_dump() for action in actions]

    def _system_prompt(self) -> str:
        return (
            "你是多人剧本杀的行动推荐器。你只给当前玩家2到3个可立即执行的下一步行动，"
            "用于玩家卡关时推进剧情。不要泄露秘密答案、隐藏身份、内部id或未来剧情结论。"
            "每条建议必须具体、可点击后直接作为玩家行动提交，并且要随着最近公开行动、AI GM、AI NPC、"
            "AI角色回应和世界状态变化更新。输出JSON对象，字段只允许actions。"
        )

    def _user_payload(self, room: GameRoom, player_id: str) -> dict[str, Any]:
        player = room.players[player_id]
        role = room.private_role(player.role_id)
        return {
            "公开上下文": room.public_context(),
            "当前玩家": {
                "name": player.name,
                "role": {
                    "name": role.get("name") if role else None,
                    "title": role.get("title") if role else None,
                    "goals": role.get("goals", []) if role else [],
                    "abilities": [
                        {"name": item.get("name"), "description": item.get("description")}
                        for item in (role.get("abilities", []) if role else [])
                    ],
                    "initial_clues": role.get("initial_clues", []) if role else [],
                },
            },
            "最近私密消息": room.private_messages.get(player_id, [])[-5:],
            "输出要求": {
                "actions": "2到3项；每项包含title,text,reason,priority",
                "title": "8到16字中文短标题",
                "text": "玩家点击后提交的完整行动句，必须具体",
                "reason": "一句话说明为什么现在适合做",
                "priority": "low, medium或high",
            },
        }

    def _normalize_actions(self, raw: Any, fallback: list[dict[str, Any]]) -> list[RecommendedAction]:
        items = raw if isinstance(raw, list) else fallback
        normalized: list[RecommendedAction] = []
        seen_text: set[str] = set()

        for item in items:
            if not isinstance(item, dict):
                continue
            text = str(item.get("text") or item.get("action") or "").strip()
            title = str(item.get("title") or "").strip()
            reason = str(item.get("reason") or "").strip()
            priority = str(item.get("priority") or "medium").strip().lower()
            if priority not in {"low", "medium", "high"}:
                priority = "medium"
            if not text or text in seen_text:
                continue
            if not title:
                title = text[:14]
            seen_text.add(text)
            normalized.append(
                RecommendedAction(
                    id=self._action_id(text),
                    title=title[:24],
                    text=text[:160],
                    reason=reason[:80],
                    priority=priority,
                )
            )
            if len(normalized) >= 3:
                break

        if len(normalized) < 2 and items is not fallback:
            for action in self._normalize_actions(fallback, fallback):
                if action.text not in seen_text:
                    normalized.append(action)
                if len(normalized) >= 2:
                    break
        return normalized[:3]

    def _deterministic_actions(self, room: GameRoom) -> list[dict[str, Any]]:
        flags = room.world_state.get("flags", {})
        if room.current_chapter_id != "chapter_3" or not flags.get("final_choice_ready"):
            return []
        return [
            {
                "title": "公开表决圣杯",
                "text": "我要求所有在场者立刻公开表决圣杯最终归属，并说明自己支持王室、教廷、秘术盟、亡魂教庭、反抗军、暗影刺盟还是共同封存。",
                "reason": "最终处置条件已经成熟，公开表决可以把剧情推进到结局判定。",
                "priority": "high",
            },
            {
                "title": "宣告共同罪责",
                "text": "我公开宣告大法师之死是多方阴谋叠加造成的共同罪责，并提议放弃独占圣杯、共同封存或销毁它。",
                "reason": "如果想走和平或共担代价路线，需要明确把共同罪责摆上审判台。",
                "priority": "high",
            },
        ]

    def _fallback_actions(self, room: GameRoom) -> list[dict[str, Any]]:
        state = room.public_world_state()
        progress = int(state.get("investigation_progress") or 0)
        alert = int(state.get("alert_level") or 0)
        recent_text = " ".join(str(item.get("text", "")) for item in room.public_log[-6:])

        actions: list[dict[str, Any]] = []
        if progress < 2 and "尸体" not in recent_text:
            actions.append(
                {
                    "title": "检查大法师尸体",
                    "text": "我仔细检查大法师的尸体、伤口和圣杯残留痕迹，寻找真正死因的证据。",
                    "reason": "命案核心证据还不足，先从尸体和残留魔法确认方向。",
                    "priority": "high",
                }
            )
        if alert >= 3:
            actions.append(
                {
                    "title": "安抚禁卫戒备",
                    "text": "我公开安抚禁卫队，要求暂缓粗暴搜查，并说明继续调查能更快锁定真凶。",
                    "reason": "戒备升高会压缩调查空间，先稳住现场。",
                    "priority": "high",
                }
            )
        actions.append(
            {
                "title": "追问最近证词",
                "text": "我追问刚才发言中最可疑的人，请对方解释案发时的位置、动机和见过的圣杯异象。",
                "reason": "最近回应里可能藏着矛盾，追问能迫使新线索浮出。",
                "priority": "medium",
            }
        )
        actions.append(
            {
                "title": "核对圣杯状态",
                "text": "我检查圣杯当前状态，并把它的光芒、温度和周围魔法残响与众人的证词进行对照。",
                "reason": "圣杯状态会影响后续局势，也能验证证词真伪。",
                "priority": "medium",
            }
        )
        return actions[:3]

    def _action_id(self, text: str) -> str:
        return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]


action_recommender = ActionRecommender()
