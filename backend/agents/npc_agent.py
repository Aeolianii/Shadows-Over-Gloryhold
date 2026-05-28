from __future__ import annotations

import json
from typing import Any

from ai_client import ai_client
from game_state import GameRoom
from models import ActionParseResult, NPCDecision


ROLE_PERSONALITY = {
    "karen": "冷静、警觉、擅长试探与转移视线；面对威胁时先找退路，再决定是否反击。",
    "elias": "温和克制、善于布局、习惯用半真半假的解释掌控节奏；不轻易承认自己的专业痕迹。",
    "morgan": "阴郁从容、敬畏死亡却不畏惧死亡；说话像低声祷告，会把生者的恐惧转化为筹码。",
    "albert": "傲慢守序、擅长政治辞令；表面维护秩序，内心急于控制证词和责任归属。",
    "linor": "温柔而审判性强，信仰坚定；会以净化和秩序之名施压，同时隐藏教廷的真实立场。",
    "kalon": "直率、警惕权贵、保护底层；愿意合作，但会反复确认对方是否把平民当筹码。",
    "vincent": "沉稳疏离、善于预判灾难；不争夺表面胜利，更在意避免圣杯造成大陆级灾变。",
}


class NPCAgent:
    async def react(self, room: GameRoom, trigger: str, action: ActionParseResult | None = None) -> dict[str, Any]:
        npc = self._select_npc(room, trigger, action)
        fallback = {
            "npc_name": npc["name"],
            "action": self._fallback_action(npc),
            "speech": self._fallback_speech(npc, trigger, action),
            "world_state_changes": [],
            "triggered_events": [],
        }
        decision = await self._ask_npc(room, npc, trigger, fallback)
        if npc.get("title"):
            decision.npc_name = npc["name"]
        room.apply_world_state_changes(decision.world_state_changes, f"AI NPC {decision.npc_name}")
        events = room.record_events(decision.triggered_events)
        self._adjust_trust(npc, trigger, decision)
        self._remember(npc, trigger, decision, room)
        return {
            "name": decision.npc_name or npc["name"],
            "text": self._public_text(decision),
            "events": events,
        }

    async def _ask_npc(self, room: GameRoom, npc: dict[str, Any], trigger: str, fallback: dict[str, Any]) -> NPCDecision:
        system = (
            "你扮演被点名的剧本杀角色或NPC。每次调用都必须严格遵守用户消息里的固定角色档案 prompt。"
            "档案中的身份、阵营、公开目标、秘密目标、性格、信任度、知识和记忆是你的长期人格锚点。"
            "秘密目标和秘密身份只能影响你的判断、措辞和隐瞒策略，不能无条件公开复述。"
            "如果玩家明确询问某个角色，必须由该角色本人回应，不要改由无关NPC发言。"
            "不得读取玩家秘密身份，不得使用内部id，不得知道未来剧情。"
            "输出必须是JSON对象，字段只允许：npc_name, action, speech, world_state_changes, triggered_events。"
        )
        user = {
            "固定角色档案prompt": self._persona_prompt(npc),
            "公开世界状态": room.public_world_state(),
            "公开最近日志": room.public_context()["recent_public_log"],
            "触发": trigger,
            "输出要求": {
                "action": "写这个角色当下做了什么，20到50字，必须贴合被问内容。",
                "speech": "写这个角色公开说出的一段话，40到100字；不要把回答交给旁观NPC。",
                "world_state_changes": "只写角色行动直接造成的世界状态变化；没有就空数组。",
                "triggered_events": "自然语言事件名，不要写内部id；没有就空数组。",
            },
        }
        data = await ai_client.chat_json(
            system,
            json.dumps(user, ensure_ascii=False),
            fallback,
            route=self._route_for_npc(npc),
        )
        normalized = {**fallback, **(data or {})}
        if not isinstance(normalized.get("world_state_changes"), list):
            normalized["world_state_changes"] = []
        if not isinstance(normalized.get("triggered_events"), list):
            normalized["triggered_events"] = []
        return NPCDecision(**normalized)

    def _select_npc(self, room: GameRoom, trigger: str, action: ActionParseResult | None = None) -> dict[str, Any]:
        role = self._targeted_role(room, trigger, action)
        if role and self.is_ai_controlled_role(room, role):
            return self._role_as_npc(role)

        npcs = room.story.get("npcs", [])
        if not npcs:
            return {"name": "剧院见证者", "faction": "中立", "goals": [], "known_info": [], "memory": []}
        alert = room.world_state.get("alert_level", 1)
        if alert >= 3:
            return npcs[0]
        words = trigger.lower()
        for npc in npcs:
            haystack = " ".join([npc.get("name", ""), npc.get("faction", ""), *npc.get("known_info", [])]).lower()
            if any(part and part in haystack for part in words.split()):
                return npc
        return min(npcs, key=lambda item: len(item.get("memory", [])))

    def human_controlled_target(self, room: GameRoom, trigger: str, action: ActionParseResult | None = None) -> dict[str, Any] | None:
        role = self._targeted_role(room, trigger, action)
        if not role:
            return None
        return role if not self.is_ai_controlled_role(room, role) else None

    def ai_controlled_target(self, room: GameRoom, trigger: str, action: ActionParseResult | None = None) -> dict[str, Any] | None:
        role = self._targeted_role(room, trigger, action)
        if not role:
            return None
        return role if self.is_ai_controlled_role(room, role) else None

    def is_ai_controlled_role(self, room: GameRoom, role: dict[str, Any]) -> bool:
        role_id = role.get("id")
        return not role_id or role_id not in room.role_claims

    def _targeted_role(self, room: GameRoom, trigger: str, action: ActionParseResult | None = None) -> dict[str, Any] | None:
        target_text = " ".join(
            part
            for part in [
                trigger,
                action.target if action else None,
                action.intent if action else None,
            ]
            if part
        ).lower()
        if not target_text:
            return None

        for role in room.story.get("player_roles", []):
            names = [role.get("name", ""), role.get("title", ""), role.get("id", "")]
            if role.get("id") == "morgan":
                names.extend([chr(0x83AB) + chr(0x7518), chr(0x6469) + chr(0x7518), "morgan"])
            if any(name and name.lower() in target_text for name in names):
                return role
        return None

    def _remember(self, npc: dict[str, Any], trigger: str, decision: NPCDecision, room: GameRoom) -> None:
        source = npc.get("_source_role") or npc
        memory = source.setdefault("memory", [])
        if len(memory) >= 12:
            summary = source.get("memory_summary") or "此前多次互动已形成持续印象。"
            oldest = memory[:-6]
            if oldest:
                source["memory_summary"] = (
                    f"{summary} 最近压缩记忆："
                    + "；".join(
                        f"{item.get('trigger', '')}->{item.get('speech', item.get('action', ''))}"[:90]
                        for item in oldest[-4:]
                    )
                )[-600:]
            del memory[:-6]
        entry = {
            "trigger": trigger[:180],
            "action": decision.action[:120],
            "speech": decision.speech[:220],
            "trust_player": self._trust_player(source),
            "chapter": room.current_chapter().get("title"),
        }
        memory.append(entry)
        npc["memory"] = memory
        if source is not npc:
            npc["memory_summary"] = source.get("memory_summary", "")

    def _role_as_npc(self, role: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": role.get("id"),
            "name": role.get("name", "NPC"),
            "title": role.get("title"),
            "faction": role.get("faction"),
            "goals": role.get("goals", []),
            "secret_identity": role.get("secret_identity", ""),
            "personality": role.get("personality") or ROLE_PERSONALITY.get(str(role.get("id")), ""),
            "known_info": [
                role.get("public_info", ""),
                *role.get("relationships", []),
                *role.get("pressure_points", []),
            ],
            "public_info": role.get("public_info", ""),
            "pressure_points": role.get("pressure_points", []),
            "relationships": role.get("relationships", []),
            "trust_player": role.setdefault("trust_player", 50),
            "memory": role.setdefault("memory", []),
            "_source_role": role,
        }

    def _persona_prompt(self, npc: dict[str, Any]) -> dict[str, Any]:
        goals = self._string_list(npc.get("goals", []))
        public_goal = npc.get("public_goal") or self._first(goals) or npc.get("public_info")
        secret = npc.get("secret") or npc.get("secret_identity") or self._secret_from_goals(goals)
        knowledge = [
            *self._string_list(npc.get("known_info", [])),
            *self._string_list(npc.get("relationships", [])),
            *self._string_list(npc.get("pressure_points", [])),
        ]
        return {
            "id": npc.get("id") or "npc_dynamic",
            "name": npc.get("name", ""),
            "role": npc.get("title") or npc.get("role") or npc.get("name", ""),
            "faction": npc.get("faction", ""),
            "goal": public_goal,
            "secret": secret,
            "personality": npc.get("personality") or self._fallback_personality(npc),
            "trust_player": self._trust_player(npc),
            "memory_summary": npc.get("memory_summary", ""),
            "knowledge": self._dedupe([item for item in knowledge if item]),
            "memory": npc.get("memory", [])[-6:],
        }

    def _trust_player(self, npc: dict[str, Any]) -> int:
        source = npc.get("_source_role") or npc
        try:
            value = int(source.get("trust_player", npc.get("trust_player", 50)))
        except (TypeError, ValueError):
            value = 50
        return max(0, min(100, value))

    def _adjust_trust(self, npc: dict[str, Any], trigger: str, decision: NPCDecision) -> None:
        source = npc.get("_source_role") or npc
        current = self._trust_player(npc)
        text = f"{trigger} {decision.action} {decision.speech}"
        delta = 0
        if any(word in text for word in ["合作", "保护", "交换", "承诺", "帮助", "救"]):
            delta += 4
        if any(word in text for word in ["威胁", "偷", "抢", "攻击", "指控", "逼问", "背叛"]):
            delta -= 6
        source["trust_player"] = max(0, min(100, current + delta))
        npc["trust_player"] = source["trust_player"]

    def _fallback_personality(self, npc: dict[str, Any]) -> str:
        if npc.get("pressure_points"):
            return "谨慎、目标明确，会根据压力点隐藏真实意图。"
        if npc.get("title"):
            return "以自身阵营利益为先，回应克制但会主动维护公开形象。"
        return "谨慎观察局势，优先保护自身安全和已知证词。"

    def _secret_from_goals(self, goals: list[str]) -> str:
        if len(goals) <= 1:
            return ""
        return "；".join(goals[1:])

    def _string_list(self, value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(item) for item in value if item]
        if value:
            return [str(value)]
        return []

    def _first(self, value: list[str]) -> str:
        return value[0] if value else ""

    def _dedupe(self, value: list[str]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for item in value:
            if item in seen:
                continue
            seen.add(item)
            result.append(item)
        return result

    def _route_for_npc(self, npc: dict[str, Any]) -> str:
        role_id = npc.get("id")
        if role_id:
            return f"role:{role_id}"
        return "npc"

    def _fallback_action(self, npc: dict[str, Any]) -> str:
        if npc.get("title"):
            return f"{npc['name']}被点名后正面回应，没有把话题交给旁观NPC。"
        return "观察众人的反应，并要求公开关键线索。"

    def _fallback_speech(self, npc: dict[str, Any], trigger: str, action: ActionParseResult | None = None) -> str:
        if npc.get("id") == "morgan" or npc.get("name") in {"莫甘", "摩甘"}:
            return f"{npc['name']}低声说：死者的灵魂并未散尽。若你问大法师的死因，就把圣光灼痕、亡灵灰烬和被抽空的生命力一起看。"
        if npc.get("title"):
            intent = (action.intent if action else trigger).strip()
            return f"{npc['name']}回应：你问的是“{intent}”。我会按我知道的线索回答，但不会替别人承担罪名。"
        return f"{npc['name']}压低声音说：局势已经变化，任何隐瞒都会让封锁变得更危险。"

    def _public_text(self, decision: NPCDecision) -> str:
        parts = [decision.action.strip(), decision.speech.strip()]
        return " ".join(part for part in parts if part)


npc_agent = NPCAgent()
