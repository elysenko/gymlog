"""Workout session routes — user-scoped, JWT-guarded. POST creates the whole
nested tree (session -> session_exercises -> set_entries) in one transaction.
"""
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user
from ..database import get_db
from ..models import Exercise, SessionExercise, SetEntry, User, WorkoutSession
from ..schemas import SessionCreate, SessionDetail, SessionListItem

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _load_detail(db: Session, user: User, session_id: int) -> WorkoutSession:
    ws = db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.id == session_id, WorkoutSession.user_id == user.id)
        .options(
            selectinload(WorkoutSession.exercises)
            .selectinload(SessionExercise.exercise),
            selectinload(WorkoutSession.exercises)
            .selectinload(SessionExercise.sets),
        )
    ).scalar_one_or_none()
    if ws is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return ws


def _serialize_detail(ws: WorkoutSession) -> dict:
    return {
        "id": ws.id,
        "date": ws.date,
        "createdAt": ws.created_at,
        "exercises": [
            {
                "id": se.id,
                "exerciseId": se.exercise_id,
                "name": se.exercise.name if se.exercise else "",
                "muscleGroup": se.exercise.muscle_group if se.exercise else "",
                "order": se.order,
                "sets": [
                    {
                        "id": s.id,
                        "setNumber": s.set_number,
                        "reps": s.reps,
                        "weight": s.weight,
                    }
                    for s in se.sets
                ],
            }
            for se in ws.exercises
        ],
    }


@router.get("", response_model=list[SessionListItem])
def list_sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    count_col = func.count(SessionExercise.id)
    rows = db.execute(
        select(WorkoutSession, count_col)
        .outerjoin(SessionExercise, SessionExercise.session_id == WorkoutSession.id)
        .where(WorkoutSession.user_id == user.id)
        .group_by(WorkoutSession.id)
        .order_by(WorkoutSession.date.desc(), WorkoutSession.created_at.desc())
    ).all()
    return [
        {
            "id": ws.id,
            "date": ws.date,
            "createdAt": ws.created_at,
            "exerciseCount": int(cnt),
        }
        for ws, cnt in rows
    ]


@router.post("", response_model=SessionDetail, status_code=201)
def create_session(
    body: SessionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    # Validate ownership of every referenced exercise up front.
    exercise_ids = {e.exercise_id for e in body.exercises}
    owned = db.execute(
        select(Exercise.id).where(
            Exercise.id.in_(exercise_ids), Exercise.user_id == user.id
        )
    ).scalars().all()
    if set(owned) != exercise_ids:
        raise HTTPException(status_code=400, detail="Unknown or unowned exercise")

    ws = WorkoutSession(user_id=user.id, date=body.date or date_type.today())
    for order, ex_in in enumerate(body.exercises):
        se = SessionExercise(exercise_id=ex_in.exercise_id, order=order)
        for i, s in enumerate(ex_in.sets, start=1):
            se.sets.append(SetEntry(set_number=i, reps=s.reps, weight=s.weight))
        ws.exercises.append(se)

    db.add(ws)
    db.commit()  # single transaction: all nested rows flush together or roll back
    db.refresh(ws)
    return _serialize_detail(_load_detail(db, user, ws.id))


@router.get("/{session_id}", response_model=SessionDetail)
def get_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return _serialize_detail(_load_detail(db, user, session_id))


@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    ws = db.execute(
        select(WorkoutSession).where(
            WorkoutSession.id == session_id, WorkoutSession.user_id == user.id
        )
    ).scalar_one_or_none()
    if ws is None:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(ws)  # cascades to session_exercises -> set_entries
    db.commit()
