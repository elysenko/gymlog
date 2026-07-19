"""Pydantic v2 request/response schemas for the GymLog API.

JSON is camelCase (the React SPA consumes these verbatim); SQLAlchemy columns are
snake_case. Response models set from_attributes + a camelCase alias generator so we
can build them straight from ORM objects while emitting camelCase keys.
"""
from datetime import date as date_type
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    """Response base: read from ORM attrs, serialize with camelCase aliases."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class SignupBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(default="", max_length=255)


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(_CamelModel):
    id: int
    email: str
    role: str
    name: str


class TokenOut(BaseModel):
    token: str
    user: UserOut


# ---------------------------------------------------------------------------
# Exercises
# ---------------------------------------------------------------------------
def _nonblank(v: str) -> str:
    if v is None or not str(v).strip():
        raise ValueError("must not be blank")
    return str(v).strip()


class ExerciseCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Annotated[str, Field(max_length=255)]
    muscle_group: Annotated[str, Field(max_length=64, alias="muscleGroup")]
    equipment: Annotated[str, Field(max_length=64)]

    _v_name = field_validator("name")(_nonblank)
    _v_mg = field_validator("muscle_group")(_nonblank)
    _v_eq = field_validator("equipment")(_nonblank)


class ExerciseUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Annotated[str | None, Field(default=None, max_length=255)] = None
    muscle_group: Annotated[str | None, Field(default=None, max_length=64, alias="muscleGroup")] = None
    equipment: Annotated[str | None, Field(default=None, max_length=64)] = None

    @field_validator("name", "muscle_group", "equipment")
    @classmethod
    def _strip_nonblank(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if not str(v).strip():
            raise ValueError("must not be blank")
        return str(v).strip()


class ExerciseOut(_CamelModel):
    id: int
    name: str
    muscle_group: str
    equipment: str
    created_at: datetime


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------
class SetIn(BaseModel):
    reps: int = Field(ge=0, le=10000)
    weight: float = Field(ge=0, le=100000)


class SessionExerciseIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    exercise_id: Annotated[int, Field(alias="exerciseId")]
    sets: Annotated[list[SetIn], Field(min_length=1)]


class SessionCreate(BaseModel):
    date: date_type | None = None
    exercises: list[SessionExerciseIn] = Field(min_length=1)


class SetOut(_CamelModel):
    id: int
    set_number: int
    reps: int
    weight: float


class SessionExerciseOut(_CamelModel):
    id: int
    exercise_id: int
    name: str
    muscle_group: str
    order: int
    sets: list[SetOut]


class SessionListItem(_CamelModel):
    id: int
    date: date_type
    created_at: datetime
    exercise_count: int


class SessionDetail(_CamelModel):
    id: int
    date: date_type
    created_at: datetime
    exercises: list[SessionExerciseOut]


# ---------------------------------------------------------------------------
# Records (personal records / PR board)
# ---------------------------------------------------------------------------
class RecordOut(_CamelModel):
    exercise_id: int
    name: str
    muscle_group: str
    best_weight: float
    achieved_on: date_type


# ---------------------------------------------------------------------------
# Admin users
# ---------------------------------------------------------------------------
class AdminUserOut(_CamelModel):
    id: int
    email: str
    role: str
    name: str
    created_at: datetime
    exercise_count: int
    session_count: int
