"""SQLAlchemy 2.x ORM models — the schema source for this stack (the SQLAlchemy
analogue of prisma/schema.prisma). Tables are ensured at boot by app.init_db
(create_all) — the `prisma migrate deploy` equivalent for this pack.

Data model (GymLog workout tracker):
  User 1─* Exercise
  User 1─* WorkoutSession 1─* SessionExercise *─1 Exercise
                              SessionExercise 1─* SetEntry
Cascade deletes flow session → session_exercise → set_entry so deleting a
workout removes its nested rows. IDs are integer PKs to match the existing
jwt_session auth glue (auth.py casts the JWT `sub` claim with int()).
"""
from datetime import date as date_type
from datetime import datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="USER")
    name: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())

    exercises: Mapped[list["Exercise"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    sessions: Mapped[list["WorkoutSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Exercise(Base):
    """A user's personal exercise-library entry. muscle_group / equipment are free
    strings with suggested values (legs/chest/back/shoulders/arms/core;
    barbell/dumbbell/machine/bodyweight/cable)."""
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    muscle_group: Mapped[str] = mapped_column(String(64), default="")
    equipment: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="exercises")
    session_links: Mapped[list["SessionExercise"]] = relationship(back_populates="exercise")

    __table_args__ = (
        Index("ix_exercises_user_muscle", "user_id", "muscle_group"),
    )


class WorkoutSession(Base):
    """One logged workout on a given date."""
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    date: Mapped[date_type] = mapped_column(Date, default=date_type.today)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="sessions")
    exercises: Mapped[list["SessionExercise"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="SessionExercise.order",
    )


class SessionExercise(Base):
    """Join row placing an Exercise into a WorkoutSession, in display order."""
    __tablename__ = "session_exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("workout_sessions.id", ondelete="CASCADE"), index=True
    )
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id", ondelete="CASCADE"), index=True)
    order: Mapped[int] = mapped_column(Integer, default=0)

    session: Mapped["WorkoutSession"] = relationship(back_populates="exercises")
    exercise: Mapped["Exercise"] = relationship(back_populates="session_links")
    sets: Mapped[list["SetEntry"]] = relationship(
        back_populates="session_exercise",
        cascade="all, delete-orphan",
        order_by="SetEntry.set_number",
    )


class SetEntry(Base):
    """A single set (reps @ weight) within a SessionExercise."""
    __tablename__ = "set_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_exercise_id: Mapped[int] = mapped_column(
        ForeignKey("session_exercises.id", ondelete="CASCADE"), index=True
    )
    set_number: Mapped[int] = mapped_column(Integer, default=1)
    reps: Mapped[int] = mapped_column(Integer, default=0)
    weight: Mapped[float] = mapped_column(Float, default=0.0)

    session_exercise: Mapped["SessionExercise"] = relationship(back_populates="sets")
