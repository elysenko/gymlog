"""Admin routes. GET /api/admin/users lists all users (minus password hash) with
per-user counts. ADMIN-only via the require_admin guard.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..database import get_db
from ..models import Exercise, User, WorkoutSession
from ..schemas import AdminUserOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=list[AdminUserOut])
def list_users(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[dict]:
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
    users = db.execute(select(User).order_by(User.created_at.asc())).scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "name": u.name,
            "createdAt": u.created_at,
            "exerciseCount": int(ex_counts.get(u.id, 0)),
            "sessionCount": int(sess_counts.get(u.id, 0)),
        }
        for u in users
    ]
