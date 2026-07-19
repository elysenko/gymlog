"""Exercise library routes — user-scoped CRUD, all JWT-guarded."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Exercise, User
from ..schemas import ExerciseCreate, ExerciseOut, ExerciseUpdate

router = APIRouter(prefix="/api/exercises", tags=["exercises"])


def _owned(db: Session, user: User, exercise_id: int) -> Exercise:
    ex = db.get(Exercise, exercise_id)
    if ex is None or ex.user_id != user.id:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ex


@router.get("", response_model=list[ExerciseOut])
def list_exercises(
    muscle_group: str | None = Query(default=None, alias="muscleGroup"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Exercise]:
    stmt = select(Exercise).where(Exercise.user_id == user.id)
    if muscle_group and muscle_group.strip():
        stmt = stmt.where(func.lower(Exercise.muscle_group) == muscle_group.strip().lower())
    stmt = stmt.order_by(Exercise.name.asc())
    return list(db.execute(stmt).scalars().all())


@router.post("", response_model=ExerciseOut, status_code=201)
def create_exercise(
    body: ExerciseCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Exercise:
    ex = Exercise(
        user_id=user.id,
        name=body.name,
        muscle_group=body.muscle_group,
        equipment=body.equipment,
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


@router.patch("/{exercise_id}", response_model=ExerciseOut)
def update_exercise(
    exercise_id: int,
    body: ExerciseUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Exercise:
    ex = _owned(db, user, exercise_id)
    if body.name is not None:
        ex.name = body.name
    if body.muscle_group is not None:
        ex.muscle_group = body.muscle_group
    if body.equipment is not None:
        ex.equipment = body.equipment
    db.commit()
    db.refresh(ex)
    return ex


@router.delete("/{exercise_id}", status_code=204)
def delete_exercise(
    exercise_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    ex = _owned(db, user, exercise_id)
    db.delete(ex)
    db.commit()
