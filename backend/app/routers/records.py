"""Personal records (PR board). GET /api/records derives, per exercise, the max
weight lifted across all of the user's set entries and the date of the session that
first achieved it. Never stored — computed at read time.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Exercise, SessionExercise, SetEntry, User, WorkoutSession
from ..schemas import RecordOut

router = APIRouter(prefix="/api/records", tags=["records"])


@router.get("", response_model=list[RecordOut])
def list_records(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = db.execute(
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
    ).all()

    best: dict[int, dict] = {}
    for ex_id, name, muscle_group, weight, date in rows:
        cur = best.get(ex_id)
        if (
            cur is None
            or weight > cur["bestWeight"]
            or (weight == cur["bestWeight"] and date < cur["achievedOn"])
        ):
            best[ex_id] = {
                "exerciseId": ex_id,
                "name": name,
                "muscleGroup": muscle_group,
                "bestWeight": weight,
                "achievedOn": date,
            }

    return sorted(best.values(), key=lambda r: r["name"].lower())
