"""Sessions router — nested workout logging, user-scoped, JWT-guarded.

POST creates WorkoutSession + SessionExercise + SetEntry rows atomically (one
commit). Ownership of every referenced exercise is validated before any row is
written, so an unowned exerciseId rolls the whole thing back (no partial rows).
"""
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user
from ..database import get_db
from ..models import Exercise, SessionExercise, SetEntry, User, WorkoutSession
from ..serializers import session_detail, session_summary

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class SetInput(BaseModel):
    reps: int = Field(ge=1)
    weight: float = Field(ge=0)


class ExerciseInput(BaseModel):
    exerciseId: int
    sets: list[SetInput] = Field(min_length=1)


class CreateSessionBody(BaseModel):
    date: date_type
    exercises: list[ExerciseInput] = Field(min_length=1)

    @field_validator("exercises")
    @classmethod
    def _non_empty(cls, v):
        if not v:
            raise ValueError("at least one exercise required")
        return v


def _load_session(db: Session, user: User, session_id: int) -> WorkoutSession:
    stmt = (
        select(WorkoutSession)
        .where(WorkoutSession.id == session_id)
        .options(
            selectinload(WorkoutSession.session_exercises)
            .selectinload(SessionExercise.exercise),
            selectinload(WorkoutSession.session_exercises)
            .selectinload(SessionExercise.sets),
        )
    )
    session = db.execute(stmt).scalar_one_or_none()
    if session is None or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("")
def list_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    stmt = (
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user.id)
        .options(selectinload(WorkoutSession.session_exercises))
        .order_by(WorkoutSession.date.desc(), WorkoutSession.created_at.desc())
    )
    rows = db.execute(stmt).scalars().all()
    return [session_summary(s) for s in rows]


@router.post("", status_code=201)
def create_session(
    body: CreateSessionBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    # Validate ownership of every referenced exercise BEFORE writing anything.
    exercise_ids = [ex.exerciseId for ex in body.exercises]
    owned = db.execute(
        select(Exercise.id).where(
            Exercise.id.in_(exercise_ids), Exercise.user_id == user.id
        )
    ).scalars().all()
    owned_set = set(owned)
    for eid in exercise_ids:
        if eid not in owned_set:
            raise HTTPException(status_code=403, detail=f"Exercise {eid} not owned by user")

    session = WorkoutSession(user_id=user.id, date=body.date)
    for order, ex_in in enumerate(body.exercises):
        se = SessionExercise(exercise_id=ex_in.exerciseId, position=order)
        for i, s in enumerate(ex_in.sets, start=1):
            se.sets.append(SetEntry(set_number=i, reps=s.reps, weight=s.weight))
        session.session_exercises.append(se)

    db.add(session)
    db.commit()  # single transaction — all rows or none
    session = _load_session(db, user, session.id)
    return session_detail(session)


@router.get("/{session_id}")
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    session = _load_session(db, user, session_id)
    return session_detail(session)


@router.delete("/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    session = _load_session(db, user, session_id)
    db.delete(session)  # ORM cascade removes session_exercises + set_entries
    db.commit()
    return {"ok": True, "id": session_id}
