"""Auth routes: signup, login, me. Self-hosted JWT (HS256) per the stack contract.

Public signup always creates a USER (the ADMIN account is seeded), matching the
plan's full_auth model.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user, hash_password, sign_token, verify_password
from ..database import get_db
from ..models import User
from ..schemas import LoginBody, SignupBody, TokenOut, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _token_response(user: User) -> dict:
    return {
        "token": sign_token(user),
        "user": {"id": user.id, "email": user.email, "role": user.role, "name": user.name},
    }


@router.post("/signup", response_model=TokenOut)
def signup(body: SignupBody, db: Session = Depends(get_db)) -> dict:
    email = body.email.lower().strip()
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        role="USER",
        name=(body.name or "").strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginBody, db: Session = Depends(get_db)) -> dict:
    email = body.email.lower().strip()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return _token_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user
