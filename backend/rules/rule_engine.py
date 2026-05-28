from __future__ import annotations

from typing import Any

from game_state import GameRoom, WORLD_STATE_CAPS
from models import ActionParseResult, WorldStateChange


class RuleEngine:
    def evaluate(self, room: GameRoom, player_id: str, action: ActionParseResult) -> dict[str, Any]:
        self._clamp_capped_world_state(room)
        player = room.players[player_id]
        role = room.private_role(player.role_id)
        chapter = room.current_chapter()
        flags = room.world_state.setdefault("flags", {})
        clues = {clue["id"] for clue in (role or {}).get("initial_clues", [])}
        score = 1
        costs: list[str] = []
        changes: dict[str, Any] = {}
        world_state_changes: list[WorldStateChange] = []

        if action.action_type == "investigate":
            if chapter["id"] in {"chapter_1", "chapter_2"}:
                score += 1
            if clues & {"clue_bloodless_body", "clue_space_residue"}:
                score += 1
            changes["investigation_attempt"] = True
        elif action.action_type in {"persuade", "cooperate"}:
            faction = (role or {}).get("faction")
            if faction:
                influence = room.world_state.setdefault("faction_influence", {})
                influence[faction] = influence.get(faction, 0) + 1
                world_state_changes.append(
                    WorldStateChange(key="faction_influence", value=influence, reason="玩家说服或合作改变势力影响力")
                )
            changes["alliances_shifted"] = True
        elif action.action_type in {"attack", "steal"}:
            score -= 1
            costs.append("行动造成警戒上升")
            room.world_state["alert_level"] = self._capped_value("alert_level", room.world_state.get("alert_level", 1), 1)
            world_state_changes.append(
                WorldStateChange(key="alert_level", value=room.world_state["alert_level"], reason="高风险行动提高警戒")
            )
        elif action.action_type == "vote":
            vote_target = action.target or action.intent
            room.world_state.setdefault("votes", {}).setdefault(vote_target, 0)
            room.world_state["votes"][vote_target] += 1
            changes["vote_recorded"] = vote_target
            world_state_changes.append(WorldStateChange(key="votes", value=room.world_state["votes"], reason="玩家表决记录"))
        elif action.action_type == "private_action":
            costs.append("你的秘密行动已被GM记录，但暂未公开")

        ability_result = self._apply_role_abilities(room, role, action, score, costs, changes, world_state_changes)
        score = ability_result["score"]

        outcome = "成功" if score >= 2 else "部分成功" if score >= 1 else "失败"
        if action.action_type == "investigate" and self._murder_truth_ready(room, action, changes):
            flags["murder_truth_exposed"] = True
            world_state_changes.append(WorldStateChange(key="flags", value=flags, reason="大法师死因被关键线索串联确认"))
        if room.world_state.get("alert_level", 0) >= 4:
            flags["crackdown_started"] = True
            world_state_changes.append(WorldStateChange(key="flags", value=flags, reason="警戒等级过高触发封锁升级"))

        for key, value in changes.items():
            room.world_state[key] = value
        self._clamp_capped_world_state(room)

        return {
            "outcome": outcome,
            "score": score,
            "costs": costs,
            "changes": changes,
            "ability_used": ability_result.get("ability_used"),
            "world_state_changes": [change.model_dump() for change in world_state_changes],
            "public": action.is_public,
        }

    def _capped_value(self, key: str, current: Any, delta: int) -> int:
        low, high = WORLD_STATE_CAPS.get(key, (0, 5))
        try:
            value = int(current)
        except (TypeError, ValueError):
            value = low
        return max(low, min(high, value + delta))

    def _clamp_capped_world_state(self, room: GameRoom) -> None:
        for key, (low, high) in WORLD_STATE_CAPS.items():
            if key not in room.world_state:
                continue
            try:
                value = int(room.world_state[key])
            except (TypeError, ValueError):
                value = low
            room.world_state[key] = max(low, min(high, value))

    def _murder_truth_ready(self, room: GameRoom, action: ActionParseResult, changes: dict[str, Any]) -> bool:
        if room.current_chapter_id != "chapter_1":
            return False
        text = f"{action.intent} {action.target or ''}"
        progress = room.world_state.get("investigation_progress", 0)
        cause_words = ["死因", "无血", "尸", "尸体", "大法师", "首席", "生命力", "抽空", "凶手", "命案", "真相"]
        evidence_words = ["空间", "残响", "镜幕", "法阵", "魂灰", "灵魂", "献祭", "守卫", "名册", "黑针", "毒针"]
        has_cause_focus = any(word in text for word in cause_words)
        has_evidence_focus = any(word in text for word in evidence_words)
        return progress >= 3 and has_cause_focus and has_evidence_focus

    def _apply_role_abilities(
        self,
        room: GameRoom,
        role: dict[str, Any] | None,
        action: ActionParseResult,
        score: int,
        costs: list[str],
        changes: dict[str, Any],
        world_state_changes: list[WorldStateChange],
    ) -> dict[str, Any]:
        if not role:
            return {"score": score, "ability_used": None}

        text = f"{action.intent} {action.target or ''}".lower()
        ability_used: str | None = None

        def use(name: str, bonus: int = 1) -> None:
            nonlocal score, ability_used
            ability_used = name
            score += bonus

        if role["title"] == "亡灵祭司" and any(word in text for word in ["死者", "亡者", "残魂", "灵魂", "魂灰", "献祭"]):
            use("亡者低语")
            changes["spirit_contact"] = True
            flags = room.world_state.setdefault("flags", {})
            flags["spirit_contacted"] = True
            if "大法师" in text or "首席" in text:
                flags["murder_truth_exposed"] = True
            world_state_changes.extend(
                [
                    WorldStateChange(key="spirit_contact", value=True, reason="亡灵祭司与死者残魂建立联系"),
                    WorldStateChange(key="flags", value=flags, reason="亡者低语触发灵魂线索"),
                ]
            )

        elif role["title"] == "反抗军首领" and any(word in text for word in ["号召", "动员", "民众", "随从", "起义", "公开真相"]):
            use("群众号召")
            influence = room.world_state.setdefault("faction_influence", {})
            faction = role.get("faction")
            if faction:
                influence[faction] = influence.get(faction, 0) + 2
            changes["public_mobilization"] = True
            world_state_changes.append(
                WorldStateChange(key="faction_influence", value=influence, reason="反抗军领袖号召力提升阵营影响")
            )

        elif role["title"] == "诡术谋士" and any(word in text for word in ["空间", "法阵", "镜幕", "转移", "夹层"]):
            use("法阵读解")
            changes["arcane_trace_read"] = True

        elif role["title"] == "暗影刺客" and action.action_type in {"steal", "investigate"} and any(word in text for word in ["潜入", "偷", "盗", "刺探", "通行", "暗影"]):
            use("暗影潜行")
            if "行动造成警戒上升" in costs:
                costs.remove("行动造成警戒上升")
            changes["shadow_infiltration"] = True
            world_state_changes.append(WorldStateChange(key="shadow_infiltration", value=True, visibility="secret", reason="暗影潜行留下隐秘行动记录"))

        elif role["title"] == "王室贵族" and any(word in text for word in ["王室", "禁卫", "守卫", "命令", "名册", "服从"]):
            use("王室特权")
            influence = room.world_state.setdefault("faction_influence", {})
            faction = role.get("faction")
            if faction:
                influence[faction] = influence.get(faction, 0) + 1
            changes["royal_pressure"] = True
            world_state_changes.append(WorldStateChange(key="faction_influence", value=influence, reason="王室特权影响禁卫与贵族态度"))

        elif role["title"] == "圣光圣女" and any(word in text for word in ["净化", "圣光", "亡灵", "禁术", "污染", "献祭"]):
            use("圣光净化")
            if room.world_state.get("alert_level", 0) > 1:
                room.world_state["alert_level"] -= 1
                world_state_changes.append(WorldStateChange(key="alert_level", value=room.world_state["alert_level"], reason="圣光净化稳定现场"))
            changes["sanctified_trace"] = True

        elif role["title"] == "中立游历法师" and any(word in text for word in ["预兆", "预言", "风险", "灾难", "调停", "平衡"]):
            use("预兆观测")
            changes["omen_reading"] = True
            flags = room.world_state.setdefault("flags", {})
            flags["catastrophe_warned"] = True
            world_state_changes.append(WorldStateChange(key="flags", value=flags, reason="预兆观测揭示独占圣杯的风险"))

        return {"score": score, "ability_used": ability_used}


rule_engine = RuleEngine()
