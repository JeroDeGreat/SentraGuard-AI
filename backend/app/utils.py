from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any


def utcnow() -> datetime:
    return datetime.now(UTC)


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def dumps_json(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), default=str)


def loads_json(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def bucket_time(value: datetime, minutes: int = 30) -> datetime:
    normalized = ensure_utc(value).replace(second=0, microsecond=0)
    minute = normalized.minute - (normalized.minute % minutes)
    return normalized.replace(minute=minute)


def isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    return ensure_utc(value).isoformat()


def timedelta_minutes(minutes: int) -> timedelta:
    return timedelta(minutes=minutes)
