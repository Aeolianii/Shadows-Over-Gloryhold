from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AIEndpoint:
    api_key: str
    base_url: str
    model: str

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)


class AIRouter:
    ROUTE_ENV = {
        "gm": "DEEPSEEK_GM_API_KEY",
        "story": "DEEPSEEK_STORY_API_KEY",
        "world_state": "DEEPSEEK_WORLD_STATE_API_KEY",
        "npc": "DEEPSEEK_NPC_API_KEY",
        "observation": "DEEPSEEK_OBSERVATION_API_KEY",
        "action_parser": "DEEPSEEK_ACTION_PARSER_API_KEY",
        "recommendation": "DEEPSEEK_RECOMMENDATION_API_KEY",
        "role:karen": "DEEPSEEK_ROLE_KAREN_API_KEY",
        "role:elias": "DEEPSEEK_ROLE_ELIAS_API_KEY",
        "role:morgan": "DEEPSEEK_ROLE_MORGAN_API_KEY",
        "role:albert": "DEEPSEEK_ROLE_ALBERT_API_KEY",
        "role:linor": "DEEPSEEK_ROLE_LINOR_API_KEY",
        "role:kalon": "DEEPSEEK_ROLE_KALON_API_KEY",
        "role:vincent": "DEEPSEEK_ROLE_VINCENT_API_KEY",
    }

    def __init__(self) -> None:
        self.provider = os.getenv("AI_PROVIDER", "").strip().lower()
        self.deepseek_base_url = self._normalize_base_url(os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"))
        self.deepseek_model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        self.openai_base_url = self._normalize_base_url(os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"))
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.trust_env = os.getenv("AI_HTTP_TRUST_ENV", "false").strip().lower() in {"1", "true", "yes", "on"}
        self._client: httpx.AsyncClient | None = None

    def _normalize_base_url(self, value: str) -> str:
        base_url = value.rstrip("/")
        if base_url.endswith("/v1"):
            return base_url
        return f"{base_url}/v1"

    def endpoint(self, route: str = "default") -> AIEndpoint:
        route_key = os.getenv(self.ROUTE_ENV.get(route, ""))
        default_deepseek_key = os.getenv("DEEPSEEK_API_KEY", "")
        if self.provider == "deepseek" or route_key or default_deepseek_key:
            return AIEndpoint(
                api_key=route_key or default_deepseek_key,
                base_url=self.deepseek_base_url,
                model=os.getenv(f"{self._route_prefix(route)}_MODEL", self.deepseek_model),
            )
        return AIEndpoint(
            api_key=os.getenv("OPENAI_API_KEY", ""),
            base_url=self.openai_base_url,
            model=self.openai_model,
        )

    def enabled(self, route: str = "default") -> bool:
        return self.endpoint(route).enabled

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    def _timeout_for(self, route: str) -> httpx.Timeout:
        if route == "action_parser":
            seconds = float(os.getenv("AI_TIMEOUT_ACTION_PARSER", "8"))
        elif route == "observation":
            seconds = float(os.getenv("AI_TIMEOUT_OBSERVATION", "12"))
        elif route.startswith("role:") or route == "npc":
            seconds = float(os.getenv("AI_TIMEOUT_NPC", "18"))
        elif route in {"gm", "story", "world_state"}:
            seconds = float(os.getenv("AI_TIMEOUT_GM", "25"))
        else:
            seconds = float(os.getenv("AI_TIMEOUT_DEFAULT", "20"))
        return httpx.Timeout(seconds, connect=min(8.0, seconds))

    def _limits(self) -> httpx.Limits:
        return httpx.Limits(
            max_connections=int(os.getenv("AI_HTTP_MAX_CONNECTIONS", "40")),
            max_keepalive_connections=int(os.getenv("AI_HTTP_MAX_KEEPALIVE", "20")),
            keepalive_expiry=float(os.getenv("AI_HTTP_KEEPALIVE_EXPIRY", "45")),
        )

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                limits=self._limits(),
                trust_env=self.trust_env,
            )
        return self._client

    async def chat_json(
        self,
        system: str,
        user: str,
        fallback: dict[str, Any],
        route: str = "default",
        temperature: float = 0.4,
    ) -> dict[str, Any]:
        endpoint = self.endpoint(route)
        if not endpoint.enabled:
            return fallback
        try:
            res = await self._get_client().post(
                f"{endpoint.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {endpoint.api_key}"},
                json={
                    "model": endpoint.model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": temperature,
                },
                timeout=self._timeout_for(route),
            )
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as exc:
            logger.warning("AI JSON route %s failed: %s", route, exc)
            return fallback

    async def chat_text(
        self,
        system: str,
        user: str,
        fallback: str,
        route: str = "default",
        temperature: float = 0.7,
    ) -> str:
        endpoint = self.endpoint(route)
        if not endpoint.enabled:
            return fallback
        try:
            res = await self._get_client().post(
                f"{endpoint.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {endpoint.api_key}"},
                json={
                    "model": endpoint.model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": temperature,
                },
                timeout=self._timeout_for(route),
            )
            res.raise_for_status()
            return res.json()["choices"][0]["message"]["content"]
        except Exception as exc:
            logger.warning("AI text route %s failed: %s", route, exc)
            return fallback

    def _route_prefix(self, route: str) -> str:
        return "DEEPSEEK_" + route.upper().replace(":", "_")


ai_client = AIRouter()
