"""camelCase JSON serializers. The SQLAlchemy models are snake_case internally,
but the API surface contract (and the React client) expects camelCase field
names (userId, muscleGroup, exerciseCount, setNumber, bestWeight, achievedOn,
createdAt). Serialization is centralized here so passwordHash is never leaked.
"""
from __future__ import annotations

from datetime import date, datetime

from .models import Exercise, SessionExercise, SetEntry, User, WorkoutSession


def _iso(value: date | datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def user_public(user: User, *, counts: dict | None = None) -> dict:
    out = {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name,
        "createdAt": _iso(user.created_at),
    }
    if counts is not None:
        out.update(counts)
    return out


def exercise_public(ex: Exercise) -> dict:
    return {
        "id": ex.id,
        "userId": ex.user_id,
        "name": ex.name,
        "muscleGroup": ex.muscle_group,
        "equipment": ex.equipment,
        "createdAt": _iso(ex.created_at),
    }


def set_public(s: SetEntry) -> dict:
    return {
        "id": s.id,
        "setNumber": s.set_number,
        "reps": s.reps,
        "weight": s.weight,
    }


def session_exercise_public(se: SessionExercise) -> dict:
    ex = se.exercise
    return {
        "id": se.id,
        "exerciseId": se.exercise_id,
        "name": ex.name if ex else None,
        "muscleGroup": ex.muscle_group if ex else None,
        "equipment": ex.equipment if ex else None,
        "order": se.position,
        "sets": [set_public(s) for s in se.sets],
    }


def session_summary(session: WorkoutSession) -> dict:
    return {
        "id": session.id,
        "date": _iso(session.date),
        "exerciseCount": len(session.session_exercises),
        "createdAt": _iso(session.created_at),
    }


def session_detail(session: WorkoutSession) -> dict:
    return {
        "id": session.id,
        "date": _iso(session.date),
        "createdAt": _iso(session.created_at),
        "exercises": [session_exercise_public(se) for se in session.session_exercises],
    }
