"""Exercises router — user-scoped personal library CRUD, JWT-guarded."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Exercise, User
from ..serializers import exercise_public

router = APIRouter(prefix="/api/exercises", tags=["exercises"])


def _non_empty(v: str) -> str:
    v = (v or "").strip()
    if not v:
        raise ValueError("must not be empty")
    return v


class CreateExerciseBody(BaseModel):
    name: str
    muscleGroup: str
    equipment: str

    @field_validator("name", "muscleGroup", "equipment")
    @classmethod
    def _required(cls, v: str) -> str:
        return _non_empty(v)


class UpdateExerciseBody(BaseModel):
    name: Optional[str] = None
    muscleGroup: Optional[str] = None
    equipment: Optional[str] = None

    @field_validator("name", "muscleGroup", "equipment")
    @classmethod
    def _not_blank(cls, v):
        if v is None:
            return v
        return _non_empty(v)


def _get_owned(db: Session, user: User, exercise_id: int) -> Exercise:
    ex = db.get(Exercise, exercise_id)
    if ex is None or ex.user_id != user.id:
        # 404 for both missing and foreign — do not leak existence of others' rows.
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ex


@router.get("")
def list_exercises(
    muscleGroup: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    stmt = select(Exercise).where(Exercise.user_id == user.id)
    if muscleGroup is not None and muscleGroup.strip():
        stmt = stmt.where(func.lower(Exercise.muscle_group) == muscleGroup.strip().lower())
    stmt = stmt.order_by(Exercise.name.asc())
    rows = db.execute(stmt).scalars().all()
    return [exercise_public(e) for e in rows]


@router.post("", status_code=201)
def create_exercise(
    body: CreateExerciseBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    ex = Exercise(
        user_id=user.id,
        name=body.name,
        muscle_group=body.muscleGroup,
        equipment=body.equipment,
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return exercise_public(ex)


@router.patch("/{exercise_id}")
def update_exercise(
    exercise_id: int,
    body: UpdateExerciseBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    ex = _get_owned(db, user, exercise_id)
    if body.name is not None:
        ex.name = body.name
    if body.muscleGroup is not None:
        ex.muscle_group = body.muscleGroup
    if body.equipment is not None:
        ex.equipment = body.equipment
    db.commit()
    db.refresh(ex)
    return exercise_public(ex)


@router.delete("/{exercise_id}")
def delete_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    ex = _get_owned(db, user, exercise_id)
    db.delete(ex)
    db.commit()
    return {"ok": True, "id": exercise_id}
