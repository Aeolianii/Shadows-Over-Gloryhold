from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Any
from uuid import uuid4

from models import Player, WorldStateChange


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


def now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


class GameRoom:
    def __init__(self, code: str, story: dict[str, Any]) -> None:
        self.code = code
        self.story = story
        self.players: dict[str, Player] = {}
        self.role_claims: dict[str, str] = {}
        self.world_state = deepcopy(story.get("world_state", {}))
        self.current_chapter_id = story["chapters"][0]["id"]
        self.public_log: list[dict[str, Any]] = [
            {
                "type": "narration",
                "at": now_iso(),
                "text": story["chapters"][0]["opening"],
            }
        ]
        self.private_messages: dict[str, list[dict[str, Any]]] = {}
        self.triggered_events: list[str] = []
        self.world_history: list[dict[str, Any]] = []
        self.recommended_actions: dict[str, list[dict[str, Any]]] = {}
        self.ended = False
        self.ending: dict[str, Any] | None = None

    def add_player(self, name: str) -> Player:
        player = Player(id=uuid4().hex[:10], name=name)
        self.players[player.id] = player
        self.private_messages[player.id] = []
        return player

    def public_room(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "story": {
                "story_id": self.story["story_id"],
                "title": self.story["title"],
                "max_players": self.story["max_players"],
                "world_setting": self.story["world_setting"],
                "factions": self.story["factions"],
                "roles": [self.public_role(role) for role in self.story["player_roles"]],
            },
            "players": [p.model_dump() for p in self.players.values()],
            "role_claims": self.role_claims,
            "current_chapter_id": self.current_chapter_id,
            "current_chapter": self.current_chapter(),
            "world_state": self.public_world_state(),
            "triggered_events": self.triggered_events[-20:],
            "public_log": self.public_log[-80:],
            "ended": self.ended,
            "ending": self.ending,
        }

    def player_view(self, player_id: str) -> dict[str, Any]:
        view = self.public_room()
        player = self.players[player_id]
        view["me"] = player.model_dump()
        view["private_messages"] = self.private_messages.get(player_id, [])[-50:]
        view["my_role"] = self.private_role(player.role_id) if player.role_id else None
        view["recommended_actions"] = self.recommended_actions.get(player_id, [])
        return view

    def public_role(self, role: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": role["id"],
            "name": role["name"],
            "title": role["title"],
            "public_info": role["public_info"],
            "avatar": role.get("avatar", ""),
            "abilities": [
                {"name": ability["name"], "description": ability["description"]}
                for ability in role.get("abilities", [])
            ],
        }

    def private_role(self, role_id: str | None) -> dict[str, Any] | None:
        if not role_id:
            return None
        role = next((r for r in self.story["player_roles"] if r["id"] == role_id), None)
        if not role:
            return None
        return {
            **self.public_role(role),
            "secret_identity": role["secret_identity"],
            "faction": role["faction"],
            "goals": role["goals"],
            "relationships": role.get("relationships", []),
            "pressure_points": role.get("pressure_points", []),
            "abilities": role.get("abilities", []),
            "initial_clues": [
                clue for clue in self.story["clues"] if clue["id"] in role.get("initial_clues", [])
            ],
        }

    def select_role(self, player_id: str, role_id: str) -> None:
        if role_id in self.role_claims and self.role_claims[role_id] != player_id:
            raise ValueError("Role already claimed")
        old_role = self.players[player_id].role_id
        if old_role and self.role_claims.get(old_role) == player_id:
            del self.role_claims[old_role]
        self.players[player_id].role_id = role_id
        self.role_claims[role_id] = player_id

    def current_chapter(self) -> dict[str, Any]:
        return next(c for c in self.story["chapters"] if c["id"] == self.current_chapter_id)

    def public_world_state(self) -> dict[str, Any]:
        self._normalize_world_state()
        hidden = {"secret_flags"}
        return {k: v for k, v in self.world_state.items() if k not in hidden}

    def public_context(self) -> dict[str, Any]:
        return {
            "story_title": self.story["title"],
            "world_setting": self.story["world_setting"],
            "chapter": {
                "title": self.current_chapter()["title"],
                "opening": self.current_chapter()["opening"],
            },
            "world_state": self.public_world_state(),
            "recent_public_log": [
                {k: v for k, v in item.items() if k not in {"player_id", "npc_id", "actor_id", "role_id"}}
                for item in self.public_log[-8:]
            ],
            "triggered_events": [self.event_public_name(event) for event in self.triggered_events[-20:]],
        }

    def event_public_name(self, event: str) -> str:
        label = str(event).strip()
        if not label:
            return "剧情事件"
        for template in self.story.get("event_templates", []):
            if label in {template.get("id"), template.get("name")}:
                return template.get("name") or "剧情事件"
        if self._looks_internal_id(label):
            return "剧情事件"
        return label

    def _looks_internal_id(self, label: str) -> bool:
        return any(char == "_" for char in label) or label.isascii()

    def role_public_name(self, role_id: str | None) -> str:
        role = next((r for r in self.story["player_roles"] if r["id"] == role_id), None)
        return role["name"] if role else "未选角色"

    def apply_world_state_changes(self, changes: list[WorldStateChange | dict[str, Any]], source: str) -> None:
        for raw in changes:
            change = self._normalize_world_state_change(raw)
            if not change:
                continue
            if not change.key or change.key in {"players", "role_claims", "story", "public_log"}:
                continue
            target = self.world_state.setdefault("secret_flags", {}) if change.visibility == "secret" else self.world_state
            target[change.key] = change.value
            self.world_history.append(
                {
                    "at": now_iso(),
                    "source": source,
                    "key": change.key,
                    "visibility": change.visibility,
                    "reason": change.reason,
                }
            )
        self._normalize_world_state()

    def _normalize_world_state_change(self, raw: WorldStateChange | dict[str, Any]) -> WorldStateChange | None:
        try:
            data = raw.model_dump() if isinstance(raw, WorldStateChange) else dict(raw)
        except (TypeError, ValueError):
            return None

        data["key"] = str(data.get("key", "")).strip()
        if not data["key"]:
            return None

        visibility = str(data.get("visibility", "public")).strip().lower()
        data["visibility"] = VISIBILITY_ALIASES.get(visibility, "public")
        data["value"] = self._normalize_world_state_value(data["key"], data.get("value"))
        data["reason"] = str(data.get("reason", "") or "")

        try:
            return WorldStateChange(**data)
        except ValueError:
            return None

    def _normalize_world_state_value(self, key: str, value: Any) -> Any:
        if key in WORLD_STATE_CAPS:
            low, high = WORLD_STATE_CAPS[key]
            return self._clamp_int(value, low, high)
        if key == "flags" and isinstance(value, dict):
            merged = dict(self.world_state.get("flags", {}))
            merged.update(value)
            return merged
        return value

    def _normalize_world_state(self) -> None:
        for key, (low, high) in WORLD_STATE_CAPS.items():
            if key in self.world_state:
                self.world_state[key] = self._clamp_int(self.world_state[key], low, high)

    def _clamp_int(self, value: Any, low: int, high: int) -> int:
        try:
            number = int(value)
        except (TypeError, ValueError):
            number = low
        return max(low, min(high, number))

    def record_events(self, events: list[str]) -> list[str]:
        recorded: list[str] = []
        for event in events:
            label = self.event_public_name(str(event).strip())
            if label and label not in self.triggered_events:
                self.triggered_events.append(label)
                recorded.append(label)
        return recorded
