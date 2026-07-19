"""Health endpoints. GET /api/health is the platform liveness probe (keep it
trivial and DB-free). GET /api/health/deep runs SELECT 1 to report DB status."""
from fastapi import APIRouter, Depends, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/health/deep")
def health_deep(response: Response, db: Session = Depends(get_db)) -> dict:
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "up"}
    except Exception:
        response.status_code = 503
        return {"status": "error", "db": "down"}
