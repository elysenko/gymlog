"""SQLAlchemy 2.x ORM models — the schema-of-record for the GymLog data model
(the SQLAlchemy analogue of prisma/schema.prisma). Tables are materialized by
`python -m app.init_db` (Base.metadata.create_all) at container boot.

Data model (from the technical plan):
  User 1───* Exercise
  User 1───* WorkoutSession 1───* SessionExercise *───1 Exercise
  SessionExercise 1───* SetEntry
Cascade deletes flow session → session_exercise → set_entry.
Personal-record (PR) values are DERIVED at read time, never stored.
"""
from __future__ import annotations

from datetime import date as date_type
from datetime import datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    # full_auth roles: USER (default for public signup) | ADMIN (seeded).
    role: Mapped[str] = mapped_column(String(32), default="USER")
    name: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    exercises: Mapped[list["Exercise"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    sessions: Mapped[list["WorkoutSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Exercise(Base):
    """A user-scoped entry in a personal exercise library."""

    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    # Free strings with suggested enums:
    #   muscle_group: legs | chest | back | shoulders | arms | core
    #   equipment:    barbell | dumbbell | machine | bodyweight | cable
    muscle_group: Mapped[str] = mapped_column(String(64), index=True)
    equipment: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="exercises")
    session_exercises: Mapped[list["SessionExercise"]] = relationship(
        back_populates="exercise", cascade="all, delete-orphan"
    )


class WorkoutSession(Base):
    """One logged workout on a given calendar date."""

    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    date: Mapped[date_type] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="sessions")
    session_exercises: Mapped[list["SessionExercise"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="SessionExercise.position",
    )


class SessionExercise(Base):
    """Join row: an exercise performed within a session, in display order."""

    __tablename__ = "session_exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("workout_sessions.id", ondelete="CASCADE"), index=True
    )
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"), index=True
    )
    # Ordering within the session (0-based). Named `position` to avoid the SQL
    # reserved word ORDER.
    position: Mapped[int] = mapped_column(Integer, default=0)

    session: Mapped["WorkoutSession"] = relationship(back_populates="session_exercises")
    exercise: Mapped["Exercise"] = relationship(back_populates="session_exercises")
    sets: Mapped[list["SetEntry"]] = relationship(
        back_populates="session_exercise",
        cascade="all, delete-orphan",
        order_by="SetEntry.set_number",
    )


class SetEntry(Base):
    """A single set: reps at a given weight, auto-numbered within its exercise."""

    __tablename__ = "set_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_exercise_id: Mapped[int] = mapped_column(
        ForeignKey("session_exercises.id", ondelete="CASCADE"), index=True
    )
    set_number: Mapped[int] = mapped_column(Integer, default=1)
    reps: Mapped[int] = mapped_column(Integer)
    weight: Mapped[float] = mapped_column(Float)

    session_exercise: Mapped["SessionExercise"] = relationship(back_populates="sets")


class SystemSetting(Base):
    """Admin-settings backing store for provisioned service credentials/config.

    Read priority (see app.config_resolver): env var wins; falls back to the
    row here; null when neither is set. Written via PATCH /api/admin/settings.
    """

    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value: Mapped[str] = mapped_column(String(2048), default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
