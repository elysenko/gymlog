"""Admin router (ADMIN role required): users listing + service settings."""
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..config_resolver import (
    ALLOWED_KEYS,
    SERVICE_KEYS,
    is_configured,
    mask,
    resolve_config,
)
from ..database import get_db
from ..models import Exercise, SystemSetting, User, WorkoutSession
from ..serializers import user_public

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[dict]:
    users = db.execute(select(User).order_by(User.created_at.asc())).scalars().all()
    # Per-user counts, computed without N+1 round-trips.
    ex_counts = dict(
        db.execute(
            select(Exercise.user_id, func.count(Exercise.id)).group_by(Exercise.user_id)
        ).all()
    )
    sess_counts = dict(
        db.execute(
            select(WorkoutSession.user_id, func.count(WorkoutSession.id)).group_by(
                WorkoutSession.user_id
            )
        ).all()
    )
    return [
        user_public(
            u,
            counts={
                "exerciseCount": int(ex_counts.get(u.id, 0)),
                "sessionCount": int(sess_counts.get(u.id, 0)),
            },
        )
        for u in users
    ]


@router.get("/settings")
def get_settings(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[dict]:
    out = []
    for service, keys in SERVICE_KEYS.items():
        settings = []
        service_configured = True
        for key in keys:
            value = resolve_config(key, db)
            configured = is_configured(value)
            service_configured = service_configured and configured
            settings.append(
                {"key": key, "value": mask(value), "configured": configured}
            )
        out.append(
            {
                "service": service,
                "configured": service_configured,
                "settings": settings,
            }
        )
    return out


@router.patch("/settings")
def patch_settings(
    body: dict = Body(...),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict:
    if not isinstance(body, dict) or not body:
        raise HTTPException(status_code=400, detail="Body must be a non-empty object")
    unknown = [k for k in body if k not in ALLOWED_KEYS]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown setting keys: {unknown}")
    for key, value in body.items():
        if not isinstance(value, str):
            raise HTTPException(status_code=400, detail=f"Value for {key} must be a string")
        row = db.get(SystemSetting, key)
        if row is None:
            db.add(SystemSetting(key=key, value=value))
        else:
            row.value = value
    db.commit()
    return {"ok": True, "updated": sorted(body.keys())}
