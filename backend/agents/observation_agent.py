from __future__ import annotations

from typing import Any
import json

from ai_client import ai_client
from game_state import GameRoom
from models import ActionParseResult, ObservationResult


OBSERVATION_VERBS = ("观察", "打量", "留意", "端详", "查看", "审视")
OBSERVATION_CUES = ("神情", "表情", "动作", "反应", "视线", "语气", "姿态", "是否隐瞒")


class ObservationAgent:
    async def observe(self, room: GameRoom, trigger: str, action: ActionParseResult) -> dict[str, Any]:
        subject = self._subject(room, trigger, action)
        fallback = {
            "subject": subject,
            "text": (
                f"你观察到{subject}在听见圣杯相关话题时短暂停顿，视线避开主舞台。"
                "对方没有立刻行动，但指节收紧，像是在压住某个不愿公开的判断。"
            ),
            "world_state_changes": [],
            "triggered_events": [],
        }
        result = await self._ask_observer(room, trigger, action, subject, fallback)
        room.apply_world_state_changes(result.world_state_changes, f"AI Observation {result.subject}")
        events = room.record_events(result.triggered_events)
        return {
            "subject": result.subject or subject,
            "text": result.text,
            "events": events,
        }

    async def _ask_observer(
        self,
        room: GameRoom,
        trigger: str,
        action: ActionParseResult,
        subject: str,
        fallback: dict[str, Any],
    ) -> ObservationResult:
        system = (
            "你是剧本杀GM的观察结果生成器，只回答玩家这次观察到了什么。"
            "不要让被观察对象主动采取新行动，不要写无关NPC的行动，不要推进新剧情。"
            "只能描述玩家可见的神态、动作、停顿、视线、语气、衣物/道具细节，以及由此产生的有限推测。"
            "可以写细微反应，例如：神态自若并回看一眼、五指紧握显得紧张、短暂停顿后避开目光。"
            "不要揭露秘密身份、阵营底牌或内部id；结论必须保持不确定。"
            "如果提供了被观察对象的公开人设、目标、已知信息或记忆，要让观察结果符合这些设定。"
            "输出必须是JSON对象，字段只允许：subject, text, world_state_changes, triggered_events。"
        )
        observed_profile = self._profile(room, subject)
        user = {
            "玩家观察行动": trigger,
            "解析结果": {
                "action_type": action.action_type,
                "target": action.target,
                "intent": action.intent,
                "risk_level": action.risk_level,
            },
            "被观察对象": subject,
            "被观察对象公开人设": observed_profile,
            "公开世界状态": room.public_world_state(),
            "公开最近日志": room.public_context()["recent_public_log"],
            "输出要求": {
                "subject": "被观察对象名称",
                "text": "第二人称观察结果，40到100字；只写玩家看到的反应和有限推测",
                "world_state_changes": "通常为空；只有观察直接发现公开状态变化时才写",
                "triggered_events": "通常为空；不要为了普通观察触发事件",
            },
        }
        data = await ai_client.chat_json(system, json.dumps(user, ensure_ascii=False), fallback, route="observation")
        normalized = {**fallback, **(data or {})}
        if not isinstance(normalized.get("world_state_changes"), list):
            normalized["world_state_changes"] = []
        if not isinstance(normalized.get("triggered_events"), list):
            normalized["triggered_events"] = []
        return ObservationResult(**normalized)

    def _subject(self, room: GameRoom, trigger: str, action: ActionParseResult) -> str:
        target = (action.target or "").strip()
        candidates = [*room.story.get("player_roles", []), *room.story.get("npcs", [])]
        for item in candidates:
            name = item.get("name", "")
            title = item.get("title", "")
            if name and (name in target or name in trigger):
                return name
            if title and (title in target or title in trigger):
                return name or title
        return target or "目标人物"

    def _profile(self, room: GameRoom, subject: str) -> dict[str, Any]:
        candidates = [*room.story.get("player_roles", []), *room.story.get("npcs", [])]
        for item in candidates:
            name = item.get("name", "")
            title = item.get("title", "")
            if subject and (subject == name or subject == title or subject in {name, title}):
                return {
                    "name": name,
                    "title": title,
                    "public_info": item.get("public_info"),
                    "faction": item.get("faction"),
                    "goals": item.get("goals", []),
                    "known_info": item.get("known_info", []),
                    "recent_memory": item.get("memory", [])[-3:],
                }
        return {}

    def is_observation(self, action: ActionParseResult, text: str) -> bool:
        combined = f"{text} {action.intent} {action.target or ''}"
        if action.action_type != "investigate":
            return False
        has_observation_verb = any(word in combined for word in OBSERVATION_VERBS)
        has_observation_cue = any(word in combined for word in OBSERVATION_CUES)
        return has_observation_verb and has_observation_cue


observation_agent = ObservationAgent()
