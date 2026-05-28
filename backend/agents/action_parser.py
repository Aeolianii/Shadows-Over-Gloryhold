from __future__ import annotations

import json
import os
from typing import Any

from ai_client import ai_client
from models import ActionParseResult


KEYWORDS = {
    "investigate": ["调查", "搜查", "检查", "寻找", "线索", "排查", "查看", "观察", "打量", "留意", "端详"],
    "persuade": ["说服", "劝", "谈判", "威胁", "拉拢", "交涉"],
    "attack": ["攻击", "刺杀", "杀", "决斗", "袭击"],
    "steal": ["偷", "盗", "夺取", "窃取", "抢夺"],
    "cooperate": ["合作", "结盟", "协作", "联手"],
    "vote": ["投票", "表决", "处置", "选择", "交给", "销毁"],
}


class ActionParser:
    async def parse(self, actor_id: str, text: str, is_public: bool) -> ActionParseResult:
        fallback_result = self._mock_parse(actor_id, text, is_public)
        if self._use_local_fast_path(fallback_result):
            return fallback_result

        fallback = fallback_result.model_dump()
        system = (
            "你是剧本杀行动解析器。只返回JSON。"
            "不要在intent、target或任何可见字段中输出内部id。"
        )
        user = f"""
解析玩家自然语言行动。
可见行动文本：{text}
行动是否公开：{is_public}

分类规则：
- 如果玩家是在观察、打量、留意某个角色/NPC的神情、动作、反应或是否隐瞒信息，action_type 必须是 investigate。
- 这类观察行动的 target 写被观察对象，intent 写玩家想从可见反应中判断什么。

JSON schema:
{{
  "action_type": "speak | investigate | persuade | attack | steal | cooperate | vote | private_action | other",
  "actor_id": "保持原值",
  "target": "自然语言目标，不写内部id",
  "intent": "自然语言意图，不写内部id",
  "risk_level": "low | medium | high",
  "is_public": true,
  "related_clues": [],
  "possible_world_state_changes": []
}}
"""
        raw = await ai_client.chat_text(system, user, json.dumps(fallback, ensure_ascii=False), route="action_parser")
        try:
            data: dict[str, Any] = json.loads(raw)
        except Exception:
            data = fallback
        data["actor_id"] = actor_id
        data["is_public"] = is_public
        return ActionParseResult(**data)

    def _use_local_fast_path(self, result: ActionParseResult) -> bool:
        mode = os.getenv("AI_ACTION_PARSER_MODE", "fast").strip().lower()
        if mode in {"ai", "always_ai"}:
            return False
        return result.action_type not in {"other"}

    def _mock_parse(self, actor_id: str, text: str, is_public: bool) -> ActionParseResult:
        action_type = "private_action" if not is_public else "other"
        for key, words in KEYWORDS.items():
            if any(word in text for word in words):
                action_type = key
                break
        if text.startswith("说") or text.startswith("发言"):
            action_type = "speak"
        risk = "high" if action_type in {"attack", "steal"} else "medium" if action_type != "speak" else "low"
        return ActionParseResult(
            action_type=action_type,
            actor_id=actor_id,
            target=None,
            intent=text,
            risk_level=risk,
            is_public=is_public,
            related_clues=[],
            possible_world_state_changes=[],
        )


action_parser = ActionParser()
