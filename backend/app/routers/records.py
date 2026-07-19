"""Records router — personal records (PRs) derived at read time, never stored.

bestWeight = max weight across all of the user's set entries for an exercise.
achievedOn = the date of the session in which that best weight was set (earliest
such session when the same max recurs).
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Exercise, SessionExercise, SetEntry, User, WorkoutSession

router = APIRouter(prefix="/api/records", tags=["records"])


@router.get("")
def list_records(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    stmt = (
        select(
            Exercise.id,
            Exercise.name,
            Exercise.muscle_group,
            SetEntry.weight,
            WorkoutSession.date,
        )
        .join(SessionExercise, SessionExercise.exercise_id == Exercise.id)
        .join(SetEntry, SetEntry.session_exercise_id == SessionExercise.id)
        .join(WorkoutSession, WorkoutSession.id == SessionExercise.session_id)
        .where(WorkoutSession.user_id == user.id)
    )
    rows = db.execute(stmt).all()

    best: dict[int, dict] = {}
    for ex_id, name, muscle_group, weight, date in rows:
        cur = best.get(ex_id)
        if (
            cur is None
            or weight > cur["bestWeight"]
            or (weight == cur["bestWeight"] and date < cur["_date"])
        ):
            best[ex_id] = {
                "exerciseId": ex_id,
                "name": name,
                "muscleGroup": muscle_group,
                "bestWeight": weight,
                "achievedOn": date.isoformat() if date else None,
                "_date": date,
            }

    out = [
        {k: v for k, v in rec.items() if k != "_date"}
        for rec in best.values()
    ]
    out.sort(key=lambda r: (r["name"] or "").lower())
    return out
