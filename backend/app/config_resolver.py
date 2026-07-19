"""Config resolver (Python analogue of the spec's lib/config.ts).

Resolution priority for any key:
  1. process env var (unless it equals the placeholder sentinel)
  2. SystemSetting DB row
  3. None — caller decides (e.g. 503 for an unconfigured integration)

Also defines the service -> keys map surfaced by /api/admin/settings. Only
`postgresql` and `minio` are provisioned for this project (see tasks.md).
"""
from __future__ import annotations

import os
from typing import Optional

from sqlalchemy.orm import Session

from .models import SystemSetting

PLACEHOLDER = "PLACEHOLDER_CONFIGURE_IN_SETTINGS"

# service key -> the env/setting keys that configure it
SERVICE_KEYS: dict[str, list[str]] = {
    "postgresql": ["DATABASE_URL"],
    "minio": ["MINIO_ENDPOINT", "MINIO_ROOT_USER", "MINIO_ROOT_PASSWORD"],
}

# Flat allowlist of keys that PATCH /api/admin/settings may write.
ALLOWED_KEYS = {k for keys in SERVICE_KEYS.values() for k in keys}


def resolve_config(key: str, db: Optional[Session] = None) -> Optional[str]:
    env_val = os.environ.get(key)
    if env_val and env_val != PLACEHOLDER:
        return env_val
    if db is not None:
        row = db.get(SystemSetting, key)
        if row and row.value and row.value != PLACEHOLDER:
            return row.value
    return None


def is_configured(value: Optional[str]) -> bool:
    return bool(value) and value != PLACEHOLDER


def mask(value: Optional[str]) -> Optional[str]:
    """Never return raw secrets over the wire — show only a masked hint."""
    if not value:
        return None
    if len(value) <= 4:
        return "****"
    return "****" + value[-4:]
