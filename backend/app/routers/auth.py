"""Auth router: signup (public, always USER), login (public), me (JWT)."""
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user, hash_password, sign_token, verify_password
from ..database import get_db
from ..models import User
from ..serializers import user_public

router = APIRouter(prefix="/api/auth", tags=["auth"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SignupBody(BaseModel):
    email: str
    password: str
    name: str = ""

    @field_validator("email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        v = (v or "").strip()
        if not _EMAIL_RE.match(v):
            raise ValueError("invalid email")
        return v.lower()

    @field_validator("password")
    @classmethod
    def _valid_password(cls, v: str) -> str:
        if not v or len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v


class LoginBody(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _email_present(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("email required")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def _password_present(cls, v: str) -> str:
        if not v:
            raise ValueError("password required")
        return v


@router.post("/signup", status_code=201)
def signup(body: SignupBody, db: Session = Depends(get_db)) -> dict:
    existing = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role="USER",  # public signup is always USER; ADMIN is seeded only
        name=body.name or body.email.split("@")[0],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": sign_token(user), "user": user_public(user)}


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_db)) -> dict:
    user = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    # Same error for unknown email and wrong password — never reveal which field failed.
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": sign_token(user), "user": user_public(user)}


@router.get("/me")
def me(user: User = Depends(get_current_user)) -> dict:
    return user_public(user)
