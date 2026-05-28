from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


STORY_DIR = Path(__file__).parent / "stories"


@lru_cache
def load_story(story_id: str) -> dict[str, Any]:
    path = STORY_DIR / f"{story_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Story not found: {story_id}")
    return json.loads(path.read_text(encoding="utf-8"))


def list_stories() -> list[dict[str, Any]]:
    stories = []
    for path in STORY_DIR.glob("*.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        stories.append(
            {
                "story_id": data["story_id"],
                "title": data["title"],
                "max_players": data["max_players"],
                "world_setting": data["world_setting"][:180] + "...",
            }
        )
    return stories

