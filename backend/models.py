from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


EventType = Literal[
    "player_message",
    "player_action",
    "private_action",
    "narration",
    "npc_message",
    "observation",
    "private_message",
    "state_update",
    "chapter_changed",
    "event_triggered",
    "game_ended",
    "system",
]


class WSMessage(BaseModel):
    type: EventType
    payload: dict[str, Any] = Field(default_factory=dict)


class CreateRoomRequest(BaseModel):
    story_id: str = "starfall_grail"
    player_name: str


class JoinRoomRequest(BaseModel):
    player_name: str


class SelectRoleRequest(BaseModel):
    player_id: str
    role_id: str


class Player(BaseModel):
    id: str
    name: str
    role_id: str | None = None
    connected: bool = False


class ActionParseResult(BaseModel):
    action_type: str
    actor_id: str
    target: str | None = None
    intent: str
    risk_level: Literal["low", "medium", "high"] = "medium"
    is_public: bool = True
    related_clues: list[str] = Field(default_factory=list)
    possible_world_state_changes: list[str] = Field(default_factory=list)


class WorldStateChange(BaseModel):
    key: str
    value: Any
    visibility: Literal["public", "secret"] = "public"
    reason: str = ""


class RecommendedAction(BaseModel):
    id: str
    title: str
    text: str
    reason: str = ""
    priority: Literal["low", "medium", "high"] = "medium"


class NPCDecision(BaseModel):
    npc_name: str
    action: str
    speech: str = ""
    world_state_changes: list[WorldStateChange] = Field(default_factory=list)
    triggered_events: list[str] = Field(default_factory=list)


class ObservationResult(BaseModel):
    subject: str
    text: str
    world_state_changes: list[WorldStateChange] = Field(default_factory=list)
    triggered_events: list[str] = Field(default_factory=list)


class GMProgression(BaseModel):
    narration: str
    world_state_changes: list[WorldStateChange] = Field(default_factory=list)
    triggered_events: list[str] = Field(default_factory=list)
    advance_chapter: bool = False
    chapter_title: str | None = None
    chapter_opening: str | None = None
    ending_title: str | None = None
    ending_text: str | None = None


class CharacterReaction(BaseModel):
    name: str
    text: str


class GMActionAdjudication(BaseModel):
    action_label: str = "行动"
    outcome: str
    narration: str
    reactions: list[CharacterReaction] = Field(default_factory=list)
    private_hint: str | None = None
    world_state_changes: list[WorldStateChange] = Field(default_factory=list)
    triggered_events: list[str] = Field(default_factory=list)
    advance_chapter: bool = False
    chapter_title: str | None = None
    chapter_opening: str | None = None
    ending_title: str | None = None
    ending_text: str | None = None
