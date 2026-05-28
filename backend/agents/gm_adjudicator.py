from __future__ import annotations

import json
import os
from typing import Any

from ai_client import ai_client
from game_state import GameRoom
from models import ActionParseResult, GMActionAdjudication


WORLD_STATE_CAPS: dict[str, tuple[int, int]] = {
    "investigation_progress": (0, 5),
    "alert_level": (0, 5),
    "trial_pressure": (0, 5),
    "public_unrest": (0, 5),
    "ritual_clock": (0, 5),
}

VISIBILITY_ALIASES = {
    "public": "public",
    "secret": "secret",
    "private": "secret",
    "hidden": "secret",
    "internal": "secret",
}


class GMAdjudicator:
    async def adjudicate(
        self,
        room: GameRoom,
        player_id: str,
        text: str,
        is_public: bool,
        action: ActionParseResult | None = None,
        rule_result: dict[str, Any] | None = None,
    ) -> GMActionAdjudication:
        if self._is_unreasonable_player_request(text):
            return GMActionAdjudication(**self._reject_unreasonable_request(room, player_id, text, is_public))

        fallback = self._fallback(room, player_id, text, is_public, action, rule_result)
        data = await ai_client.chat_json(
            self._system_prompt(),
            json.dumps(self._user_payload(room, player_id, text, is_public, action, rule_result), ensure_ascii=False),
            fallback,
            route="gm",
            temperature=0.55,
        )
        normalized = {**fallback, **(data or {})}
        if not isinstance(normalized.get("reactions"), list):
            normalized["reactions"] = []
        if not isinstance(normalized.get("world_state_changes"), list):
            normalized["world_state_changes"] = []
        if not isinstance(normalized.get("triggered_events"), list):
            normalized["triggered_events"] = []
        normalized["world_state_changes"] = [
            *(rule_result or {}).get("world_state_changes", []),
            *normalized.get("world_state_changes", []),
        ]
        normalized["world_state_changes"] = self._normalize_world_state_changes(normalized["world_state_changes"])
        if self._should_refine_world_state():
            normalized = await self._refine_world_state(room, text, normalized)
            normalized["world_state_changes"] = self._normalize_world_state_changes(normalized.get("world_state_changes", []))
        normalized = await self._review_investigation_progress(room, player_id, text, action, rule_result, normalized)
        normalized["world_state_changes"] = self._normalize_world_state_changes(normalized.get("world_state_changes", []))
        return GMActionAdjudication(**normalized)

    def _should_refine_world_state(self) -> bool:
        return os.getenv("AI_REFINE_WORLD_STATE", "false").strip().lower() in {"1", "true", "yes", "on"}

    def _normalize_world_state_changes(self, changes: list[Any]) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []
        for raw in changes:
            if hasattr(raw, "model_dump"):
                data = raw.model_dump()
            elif isinstance(raw, dict):
                data = dict(raw)
            else:
                continue

            key = str(data.get("key", "")).strip()
            if not key or key in {"players", "role_claims", "story", "public_log"}:
                continue

            visibility = str(data.get("visibility", "public")).strip().lower()
            data["key"] = key
            data["visibility"] = VISIBILITY_ALIASES.get(visibility, "public")
            data["reason"] = str(data.get("reason", "") or "")
            if key in WORLD_STATE_CAPS:
                low, high = WORLD_STATE_CAPS[key]
                data["value"] = self._clamp_int(data.get("value"), low, high)
            normalized.append(data)
        return normalized

    def _clamp_int(self, value: Any, low: int, high: int) -> int:
        try:
            number = int(value)
        except (TypeError, ValueError):
            number = low
        return max(low, min(high, number))

    async def _review_investigation_progress(
        self,
        room: GameRoom,
        player_id: str,
        text: str,
        action: ActionParseResult | None,
        rule_result: dict[str, Any] | None,
        adjudication: dict[str, Any],
    ) -> dict[str, Any]:
        if not action or action.action_type != "investigate":
            return adjudication
        if room.current_chapter_id not in {"chapter_1", "chapter_2"}:
            return adjudication

        fallback = self._fallback_investigation_review(room, text)
        data = await ai_client.chat_json(
            (
                "你是剧本杀 world state 审核器，专门判断调查进度是否应该上升。"
                "不要被行动数量影响，只看本次行动是否带来新的、具体的、与当前章节核心谜题有关的信息。"
                "泛泛询问、重复检查、无目标行动、只表达态度、或没有触碰新证据时，delta 必须是 0。"
                "具体检查尸体死因、圣杯残响、镜幕夹层、守卫名册、毒针、亡灵灰烬、证词矛盾等关键链条时，delta 可为 1。"
                "只有一次行动同时串联多个关键证据并产生明确新突破时，delta 才能为 2；不要轻易给 2。"
                "输出 JSON，只允许字段：delta, reason。"
            ),
            json.dumps(
                {
                    "玩家原话": text,
                    "解析结果": action.model_dump(),
                    "规则结果": rule_result or {},
                    "当前章节": room.current_chapter(),
                    "当前调查进度": room.world_state.get("investigation_progress", 0),
                    "公开上下文": room.public_context(),
                    "最近公开日志": room.public_log[-6:],
                    "输出要求": {
                        "delta": "0、1 或 2；多数普通调查应为0或1",
                        "reason": "一句话说明为什么推进或不推进",
                    },
                },
                ensure_ascii=False,
            ),
            fallback,
            route="world_state",
            temperature=0.2,
        )
        delta = self._clamp_int(data.get("delta", fallback["delta"]), 0, 2)
        reason = str(data.get("reason") or fallback["reason"])
        return self._replace_investigation_progress_change(adjudication, room, delta, reason)

    def _fallback_investigation_review(self, room: GameRoom, text: str) -> dict[str, Any]:
        recent_text = " ".join(str(item.get("text", "")) for item in room.public_log[-8:])
        concrete_keywords = [
            "尸体",
            "死因",
            "大法师",
            "圣杯",
            "残响",
            "镜幕",
            "夹层",
            "法阵",
            "守卫",
            "名册",
            "毒针",
            "亡灵",
            "灵魂",
            "灰烬",
            "证词",
            "血",
            "封印",
        ]
        repeated = text and text in recent_text
        concrete_hits = sum(1 for keyword in concrete_keywords if keyword in text)
        if repeated:
            return {"delta": 0, "reason": "本次调查与最近行动重复，没有形成新的公开突破。"}
        if concrete_hits >= 3:
            return {"delta": 1, "reason": "本次调查触及多个关键证据点，调查进度小幅推进。"}
        if concrete_hits >= 1 and len(text.strip()) >= 12:
            return {"delta": 1, "reason": "本次调查有明确目标，获得少量有效推进。"}
        return {"delta": 0, "reason": "本次调查目标仍偏泛，暂不提高调查进度。"}

    def _replace_investigation_progress_change(
        self,
        adjudication: dict[str, Any],
        room: GameRoom,
        delta: int,
        reason: str,
    ) -> dict[str, Any]:
        changes = [
            change
            for change in adjudication.get("world_state_changes", [])
            if not (isinstance(change, dict) and change.get("key") == "investigation_progress")
        ]
        if delta > 0:
            current = room.world_state.get("investigation_progress", 0)
            changes.append(
                {
                    "key": "investigation_progress",
                    "value": self._clamp_int(current + delta, 0, 5),
                    "visibility": "public",
                    "reason": reason,
                }
            )
        adjudication["world_state_changes"] = changes
        return adjudication

    async def _refine_world_state(self, room: GameRoom, text: str, adjudication: dict[str, Any]) -> dict[str, Any]:
        fallback = {
            "world_state_changes": adjudication.get("world_state_changes", []),
            "triggered_events": adjudication.get("triggered_events", []),
            "private_hint": adjudication.get("private_hint"),
        }
        data = await ai_client.chat_json(
            (
                "你是剧本杀 world state 审核器。只根据本次行动裁定、公开世界状态和公开日志，判断是否需要修改世界状态、"
                "触发事件或给玩家私密提示。不要重写剧情文本，不要增加无根据变化，不要泄露秘密。"
                "输出 JSON 字段只允许：world_state_changes, triggered_events, private_hint。"
            ),
            json.dumps(
                {
                    "玩家原话": text,
                    "行动裁定": adjudication,
                    "公开上下文": room.public_context(),
                    "现有世界状态": room.public_world_state(),
                    "输出要求": {
                        "world_state_changes": "数组，每项{key,value,visibility,reason}；只有状态真实改变才写",
                        "triggered_events": "数组，自然语言事件名；没有则空",
                        "private_hint": "需要给行动玩家单独知道的信息，否则null",
                    },
                },
                ensure_ascii=False,
            ),
            fallback,
            route="world_state",
            temperature=0.25,
        )
        if isinstance(data.get("world_state_changes"), list):
            adjudication["world_state_changes"] = data["world_state_changes"]
        if isinstance(data.get("triggered_events"), list):
            adjudication["triggered_events"] = data["triggered_events"]
        if "private_hint" in data:
            adjudication["private_hint"] = data["private_hint"]
        return adjudication

    def _system_prompt(self) -> str:
        return (
            "你是多人剧本杀的真实桌面 GM，不是满足玩家愿望的旁白机器。你的职责是公平裁定行动、维护剧本规则、保护秘密信息，"
            "并用具体后果引导玩家继续调查、交涉、表决或承担代价。玩家动作类型不受固定分类限制，必须结合玩家原话、角色能力、"
            "公开日志、世界状态、目标角色是否由真人玩家控制来判断行动是否成功、代价、现场变化和角色反应。"
            "对于不合理要求必须明确否定，不能顺从。例如玩家要求“直接进入胜利结局”“跳过调查拿到圣杯”“让所有 NPC 立刻承认秘密”"
            "“无条件杀死所有人”“修改自己的身份/能力/线索”等，应判定为被阻止或无效，并说明原因，同时给出一个可执行的替代方向。"
            "不要把玩家的愿望直接写成既成事实；结局、章节推进、圣杯归属和重大世界状态只能在当前世界状态、规则结果或明确终局 flag 支持时发生。"
            "像真实 GM 一样说话：承认合理创意，给出清晰裁定，描述可见后果，提示下一步可尝试的行动，但不要剧透隐藏真相。"
            "如果玩家是在偷窃、攻击、施法、搜查、胁迫、交涉、试探、伪装、移动、保护、破坏、交换情报或任何其他动作，"
            "都要按具体语义裁定，不要强行归入观察。只有玩家明确说观察/打量/查看神情动作时，才写成观察结果。"
            "如果目标角色已被真人玩家占用，不要替该角色说话；但仍可裁定外部行动是否成功，例如偷取、跟踪、攻击或制造压力。"
            "如果目标角色未被真人玩家占用，可以让该角色像人类玩家一样行动或回应。"
            "不要泄露秘密身份、内部 id、数据库字段或未来答案。输出必须是 JSON 对象，字段只允许："
            "action_label, outcome, narration, reactions, private_hint, world_state_changes, triggered_events, "
            "advance_chapter, chapter_title, chapter_opening, ending_title, ending_text。"
        )

    def _is_unreasonable_player_request(self, text: str) -> bool:
        normalized = text.strip().lower()
        if not normalized:
            return False
        direct_win_patterns = [
            "直接进入胜利",
            "直接胜利",
            "进入胜利结局",
            "跳到结局",
            "跳过剧情",
            "立刻通关",
            "马上通关",
            "我赢了",
            "获得胜利",
            "直接拿到圣杯",
            "无条件获得圣杯",
            "所有人承认",
            "所有npc承认",
            "让所有npc",
            "修改我的身份",
            "修改角色身份",
            "给我所有线索",
            "透露所有秘密",
        ]
        if any(pattern in normalized for pattern in direct_win_patterns):
            return True
        return "结局" in normalized and any(word in normalized for word in ["直接", "立刻", "马上", "跳过"])

    def _reject_unreasonable_request(self, room: GameRoom, player_id: str, text: str, is_public: bool) -> dict[str, Any]:
        player = room.players[player_id]
        chapter = room.current_chapter().get("title", "当前章节")
        return {
            "action_label": "不合理要求",
            "outcome": "被阻止",
            "narration": (
                f"GM裁定：{player.name}的要求“{text}”不能直接成立。{chapter}仍需要通过行动、证据、说服或表决来推进；"
                "你可以改为提出一个具体做法，例如调查圣杯残响、质询某名角色，或发起公开表决。"
            ),
            "reactions": [],
            "private_hint": None if is_public else "这类要求不能直接改写剧情结果；请把意图改写成角色能实际执行的行动。",
            "world_state_changes": [],
            "triggered_events": [],
            "advance_chapter": False,
            "chapter_title": None,
            "chapter_opening": None,
            "ending_title": None,
            "ending_text": None,
        }

    def _user_payload(
        self,
        room: GameRoom,
        player_id: str,
        text: str,
        is_public: bool,
        action: ActionParseResult | None,
        rule_result: dict[str, Any] | None,
    ) -> dict[str, Any]:
        player = room.players[player_id]
        player_role = room.private_role(player.role_id)
        return {
            "玩家": {"name": player.name, "role": player_role},
            "玩家原话": text,
            "是否公开行动": is_public,
            "解析仅供参考": action.model_dump() if action else None,
            "确定性规则结算": rule_result,
            "目标角色控制状态": self._role_control(room, text, action),
            "公开上下文": room.public_context(),
            "可用角色人设": self._role_profiles(room),
            "NPC人设": room.story.get("npcs", []),
            "事件模板名称": [item.get("name") for item in room.story.get("event_templates", [])],
            "输出要求": {
                "action_label": "用自然中文概括玩家动作，不要使用内部分类",
                "outcome": "成功 / 部分成功 / 失败 / 被阻止 / 等待真人回应 等自然中文裁定",
                "narration": "40到160字，写清楚结果、原因、代价或新局面；不要空泛",
                "reactions": "数组，每项{name,text}。只写因本动作自然会回应的AI角色或NPC；真人控制角色不要代答",
                "private_hint": "只在需要给行动玩家单独提示时填写，否则为null",
                "world_state_changes": "数组，每项{key,value,visibility,reason}；只写真实变化",
                "triggered_events": "数组，使用自然语言事件名；没有则空数组",
            },
        }

    def _role_control(self, room: GameRoom, text: str, action: ActionParseResult | None) -> list[dict[str, Any]]:
        haystack = " ".join(part for part in [text, action.target if action else None, action.intent if action else None] if part)
        result: list[dict[str, Any]] = []
        for role in room.story.get("player_roles", []):
            names = [role.get("name", ""), role.get("title", ""), role.get("id", "")]
            if role.get("id") == "morgan":
                names.extend([chr(0x83AB) + chr(0x7518), chr(0x6469) + chr(0x7518), "morgan"])
            if any(name and name in haystack for name in names):
                owner = room.role_claims.get(role.get("id", ""))
                result.append(
                    {
                        "name": role.get("name"),
                        "title": role.get("title"),
                        "controlled_by": "human" if owner else "ai",
                        "human_player_name": room.players[owner].name if owner else None,
                    }
                )
        return result

    def _role_profiles(self, room: GameRoom) -> list[dict[str, Any]]:
        profiles: list[dict[str, Any]] = []
        for role in room.story.get("player_roles", []):
            profiles.append(
                {
                    "name": role.get("name"),
                    "title": role.get("title"),
                    "public_info": role.get("public_info"),
                    "faction": role.get("faction"),
                    "goals": role.get("goals", []),
                    "abilities": role.get("abilities", []),
                    "relationships": role.get("relationships", []),
                    "pressure_points": role.get("pressure_points", []),
                    "controlled_by": "human" if role.get("id") in room.role_claims else "ai",
                }
            )
        return profiles

    def _fallback(
        self,
        room: GameRoom,
        player_id: str,
        text: str,
        is_public: bool,
        action: ActionParseResult | None,
        rule_result: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        player = room.players[player_id]
        target_controls = self._role_control(room, text, action)
        human_target = next((item for item in target_controls if item["controlled_by"] == "human"), None)
        ai_target = next((item for item in target_controls if item["controlled_by"] == "ai"), None)
        label = action.action_type if action else "行动"
        if human_target and action and action.action_type == "speak":
            outcome = "等待真人玩家回应"
            narration = f"{player.name}把话题抛向{human_target['name']}，现场的注意力随之转移；对方需要亲自回应。"
            reactions: list[dict[str, str]] = []
        else:
            outcome = (rule_result or {}).get("outcome") or "部分成功"
            narration = f"GM裁定：围绕“{text}”的行动结果为{outcome}，现场后果已被记录。"
            reactions = []
            if ai_target:
                reactions.append(
                    {
                        "name": ai_target["name"],
                        "text": f"{ai_target['name']}没有回避这次互动，但只给出谨慎回应，避免暴露真正立场。",
                    }
                )
        return {
            "action_label": label,
            "outcome": outcome,
            "narration": narration,
            "reactions": reactions,
            "private_hint": None if is_public else "这次行动暂未公开，但 GM 已记录其后果。",
            "world_state_changes": [],
            "triggered_events": [],
            "advance_chapter": False,
            "chapter_title": None,
            "chapter_opening": None,
            "ending_title": None,
            "ending_text": None,
        }


gm_adjudicator = GMAdjudicator()
