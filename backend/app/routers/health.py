"""Health routes. GET /api/health is the platform's backend reachability probe —
keep it fast and dependency-free. GET /api/health/deep additionally checks the DB.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
def health() -> dict:
    return {"status": "ok"}


@router.get("/deep")
def health_deep(db: Session = Depends(get_db)) -> dict:
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "up"}
    except Exception as exc:  # noqa: BLE001 — report, don't crash the probe
        return {"status": "degraded", "db": "down", "error": str(exc)}
