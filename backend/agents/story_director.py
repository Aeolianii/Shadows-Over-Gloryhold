from __future__ import annotations

from typing import Any

from ai_client import ai_client
from game_state import GameRoom, VISIBILITY_ALIASES
from models import GMProgression


class StoryDirector:
    async def initial_push(self, room: GameRoom) -> str | None:
        flags = room.world_state.setdefault("flags", {})
        if flags.get("gm_started"):
            return None
        flags["gm_started"] = True
        fallback = {
            "narration": (
                "GM推进：所有已入场角色被封锁在剧院内。禁卫要求众人说明立场，"
                "圣杯余波开始扰动舞台，第一轮调查与试探正式开始。"
            ),
            "world_state_changes": [
                {"key": "phase", "value": "开场调查", "visibility": "public", "reason": "玩家完成选角后进入正式剧情"}
            ],
            "triggered_events": ["开场封锁"],
        }
        progression = await self._ask_gm(room, "玩家完成选角，启动第一轮公开剧情推进。", fallback)
        room.apply_world_state_changes(progression.world_state_changes, "AI GM")
        room.record_events(progression.triggered_events)
        return self._clean_public_text(progression.narration)

    async def advance_after_world_update(self, room: GameRoom, trigger: str, rule_result: dict[str, Any]) -> dict[str, Any]:
        deterministic_events = self._events_from_flags(room)
        fallback = self._fallback_progression(room, deterministic_events, trigger, rule_result)
        progression = await self._ask_gm(
            room,
            f"行动和规则结算已改变世界状态。触发原因：{trigger}。规则结算：{self._public_rule_result(rule_result)}",
            fallback,
        )
        progression = self._enforce_progression_gates(room, progression)
        if self._is_vague_narration(progression.narration):
            progression.narration = fallback["narration"]

        room.apply_world_state_changes(progression.world_state_changes, "AI GM")
        events = room.record_events([*deterministic_events, *progression.triggered_events])
        chapter_text = self._maybe_advance_chapter(room, progression)
        ending = self._maybe_end_game(room, progression)

        return {
            "narration": self._clean_public_text(progression.narration),
            "events": events,
            "chapter_text": chapter_text,
            "ending": ending,
        }

    async def _ask_gm(self, room: GameRoom, trigger: str, fallback: dict[str, Any]) -> GMProgression:
        system = (
            "你是多人剧本杀的真实桌面 GM。你只能基于公开世界状态、公开日志和已触发事件推进剧情；"
            "你的目标是像真人 GM 一样把玩家的有效行动转化成清晰后果，推动调查、交涉、阵营抉择、公开审判和最终处置逐步发生。"
            "不要原地复述车轱辘话；每次推进都要指出局势哪里改变、下一步压力在哪里，或者为什么还不能推进。"
            "不得满足玩家的不合理愿望或跳关要求；结局、章节推进、圣杯归属和重大世界状态只能在当前世界状态、规则结果或确定性 flag 支持时发生。"
            "如果触发内容要求直接胜利、跳过调查、无条件拿到圣杯或强迫所有角色承认秘密，应否定并引导回当前章节可执行目标。"
            "不得泄露玩家秘密身份、内部id、数据库字段名或未来章节答案。"
            "输出必须是JSON对象，字段只允许：narration, world_state_changes, triggered_events, "
            "advance_chapter, chapter_title, chapter_opening, ending_title, ending_text。"
        )
        user = {
            "公开上下文": room.public_context(),
            "可触发事件名称": [item.get("name") for item in room.story.get("event_templates", [])],
            "当前触发": trigger,
            "输出要求": {
                "narration": "60到140字中文公开叙事，不包含任何内部id",
                "world_state_changes": "数组；每项包含key,value,visibility,reason；只能改变世界状态",
                "triggered_events": "数组；使用自然语言事件名",
                "advance_chapter": "是否进入下一章；只有当前世界状态已满足章节门槛时才为true",
                "ending_title/ending_text": "仅在结局已经可以判定时填写；不得因为玩家要求胜利而填写",
            },
        }
        data = await ai_client.chat_json(system, str(user), fallback, route="story")
        return GMProgression(**self._normalize_progression(data, fallback))

    def _normalize_progression(self, data: dict[str, Any], fallback: dict[str, Any]) -> dict[str, Any]:
        merged = {**fallback, **(data or {})}
        if not isinstance(merged.get("world_state_changes"), list):
            merged["world_state_changes"] = []
        else:
            normalized_changes: list[dict[str, Any]] = []
            for item in merged["world_state_changes"]:
                if not isinstance(item, dict):
                    continue
                change = {**item}
                visibility = str(change.get("visibility") or "public").lower()
                change["visibility"] = VISIBILITY_ALIASES.get(visibility, "secret")
                normalized_changes.append(change)
            merged["world_state_changes"] = normalized_changes
        if not isinstance(merged.get("triggered_events"), list):
            merged["triggered_events"] = []
        merged["narration"] = self._clean_public_text(str(merged.get("narration") or fallback["narration"]))
        return merged

    def _events_from_flags(self, room: GameRoom) -> list[str]:
        flags = room.world_state.get("flags", {})
        events: list[str] = []
        for template in room.story.get("event_templates", []):
            required = template.get("flags", [])
            if required and all(flags.get(flag) for flag in required):
                events.append(template.get("name", "剧情事件"))
        return events

    def _fallback_progression(self, room: GameRoom, events: list[str], trigger: str = "", rule_result: dict[str, Any] | None = None) -> dict[str, Any]:
        flags = room.world_state.get("flags", {})
        advance = False
        if room.current_chapter_id == "chapter_1":
            advance = self._can_advance_from_chapter_1(room)
        if room.current_chapter_id == "chapter_2":
            influence_total = sum(room.world_state.get("faction_influence", {}).values())
            advance = influence_total >= 5 or flags.get("crackdown_started", False) or flags.get("final_choice_ready", False)
        return {
            "narration": self._fallback_narration(room, trigger, rule_result or {}),
            "world_state_changes": [],
            "triggered_events": events,
            "advance_chapter": advance,
        }

    def _fallback_narration(self, room: GameRoom, trigger: str = "", rule_result: dict[str, Any] | None = None) -> str:
        result = rule_result or {}
        outcome = result.get("outcome") or "已记录"
        changes = result.get("changes") or {}
        if trigger:
            concrete = f"GM裁定：围绕“{trigger}”的行动结果为{outcome}。"
            if changes.get("investigation_progress") is not None:
                concrete += f" 调查进度推进到{changes['investigation_progress']}/5；新的重点落在死因、圣杯残响与相关证词的交叉验证上。"
            elif changes.get("alliances_shifted"):
                concrete += " 这次交涉改变了相关阵营的态度，后续更容易引出立场交换或公开反驳。"
            elif changes:
                concrete += " 现场状态已经出现可见变化，后续应继续追问具体证据或要求对方给出承诺。"
            else:
                concrete += " 暂无新的公开状态变化；这更像一次问询或试探，关键在于对方刚才给出的回答。"
            return concrete
        if room.current_chapter_id == "chapter_1":
            return "GM提示：剧院封锁仍在持续。当前线索还不足以确认大法师死因，众人的观察与试探只能提供态度变化，真正的命案真相仍需关键证据串联。"
        return "GM推进：局势因刚才的行动发生偏移，新的线索、戒备与势力压力正在改变剧院内的选择空间。"

    def _is_vague_narration(self, narration: str) -> bool:
        text = narration.strip()
        vague_parts = [
            "局势",
            "发生偏移",
            "新的线索",
            "选择空间",
            "正在改变",
            "势力压力",
        ]
        return len(text) < 80 and sum(part in text for part in vague_parts) >= 2

    def _can_advance_from_chapter_1(self, room: GameRoom) -> bool:
        flags = room.world_state.get("flags", {})
        progress = int(room.world_state.get("investigation_progress") or 0)
        if progress >= 5:
            flags["murder_truth_exposed"] = True
            return True
        return bool(flags.get("murder_truth_exposed"))

    def _enforce_progression_gates(self, room: GameRoom, progression: GMProgression) -> GMProgression:
        if room.current_chapter_id == "chapter_1" and not self._can_advance_from_chapter_1(room):
            progression.advance_chapter = False
            progression.chapter_title = None
            progression.chapter_opening = None
            blocked_events = {"命案真相排查"}
            progression.triggered_events = [event for event in progression.triggered_events if room.event_public_name(event) not in blocked_events]
            progression.world_state_changes = [
                change
                for change in progression.world_state_changes
                if not (change.key == "flags" and isinstance(change.value, dict) and change.value.get("murder_truth_exposed"))
            ]
        return progression

    def _maybe_advance_chapter(self, room: GameRoom, progression: GMProgression) -> str | None:
        deterministic_advance = False
        if room.current_chapter_id == "chapter_1":
            deterministic_advance = self._can_advance_from_chapter_1(room)
        elif room.current_chapter_id == "chapter_2":
            flags = room.world_state.get("flags", {})
            influence_total = sum(room.world_state.get("faction_influence", {}).values())
            deterministic_advance = influence_total >= 5 or flags.get("crackdown_started", False) or flags.get("final_choice_ready", False)

        if not progression.advance_chapter and not deterministic_advance:
            return None
        if room.current_chapter_id == "chapter_1" and not self._can_advance_from_chapter_1(room):
            return None
        chapters = room.story["chapters"]
        index = next(i for i, chapter in enumerate(chapters) if chapter["id"] == room.current_chapter_id)
        if index >= len(chapters) - 1:
            return None
        next_chapter = chapters[index + 1]
        room.current_chapter_id = next_chapter["id"]
        title = progression.chapter_title or next_chapter["title"]
        opening = progression.chapter_opening or next_chapter["opening"]
        return f"{title}\n{opening}"

    def _maybe_end_game(self, room: GameRoom, progression: GMProgression) -> dict[str, Any] | None:
        if progression.ending_title and progression.ending_text:
            flags = room.world_state.setdefault("flags", {})
            if room.current_chapter_id != "chapter_3" or not self._ending_conditions_met(room, flags):
                return None
            room.ended = True
            room.ending = {"id": "ending_ai", "title": progression.ending_title, "text": progression.ending_text}
            return room.ending

        flags = room.world_state.setdefault("flags", {})
        if room.current_chapter_id == "chapter_3" and self._ending_conditions_met(room, flags):
            return self._ending_from_world_state(room)
        if flags.get("crackdown_started") and room.current_chapter_id == "chapter_3":
            return self._ending(room, "ending_warlords")
        return None

    def _ending_conditions_met(self, room: GameRoom, flags: dict[str, Any]) -> bool:
        votes = room.world_state.get("votes", {})
        vote_total = sum(value for value in votes.values() if isinstance(value, int))
        return (
            vote_total >= self._required_vote_count(room)
            or bool(flags.get("grail_finalized"))
            or bool(flags.get("ending_ready"))
            or bool(flags.get("final_verdict_reached"))
        )

    def _required_vote_count(self, room: GameRoom) -> int:
        active_players = sum(1 for player in room.players.values() if player.role_id)
        return min(3, max(1, active_players))

    def _ending_from_world_state(self, room: GameRoom) -> dict[str, Any]:
        flags = room.world_state.get("flags", {})
        if flags.get("shared_guilt_accepted") or flags.get("grail_destroyed"):
            return self._ending(room, "ending_peace")
        if flags.get("starfall_triggered") or flags.get("grail_monopoly_disaster"):
            return self._ending(room, "ending_starfall")

        top = self._top_faction(room)
        faction_endings = [
            (("王", "royal"), "ending_royal"),
            (("圣光", "教廷", "church"), "ending_church"),
            (("暗影", "刺盟", "shadow"), "ending_shadow"),
            (("幽诡", "秘术", "arcane"), "ending_arcane"),
            (("亡魂", "亡者", "death"), "ending_death"),
            (("反抗", "自由", "rebels"), "ending_freedom"),
        ]
        for markers, ending_id in faction_endings:
            if any(marker in top for marker in markers):
                return self._ending(room, ending_id)
        return self._ending(room, "ending_warlords")

    def _top_faction(self, room: GameRoom) -> str:
        influence = room.world_state.get("faction_influence", {})
        if not isinstance(influence, dict) or not influence:
            return ""
        numeric_items = {str(key): value for key, value in influence.items() if isinstance(value, (int, float))}
        return max(numeric_items, key=numeric_items.get) if numeric_items else ""

    def _ending(self, room: GameRoom, ending_id: str) -> dict[str, Any]:
        ending = next(e for e in room.story["endings"] if e["id"] == ending_id)
        room.ended = True
        room.ending = {"id": ending["id"], "title": ending["title"], "text": ending["text"]}
        return room.ending

    def _public_rule_result(self, result: dict[str, Any]) -> dict[str, Any]:
        return {
            "outcome": result.get("outcome"),
            "score": result.get("score"),
            "costs": result.get("costs", []),
            "changes": result.get("changes", {}),
        }

    def _clean_public_text(self, text: str) -> str:
        blocked = ["player_id", "role_id", "npc_id", "chapter_id", "actor_id", "current_chapter_id"]
        cleaned = text
        for word in blocked:
            cleaned = cleaned.replace(word, "内部字段")
        return cleaned.strip()


story_director = StoryDirector()
