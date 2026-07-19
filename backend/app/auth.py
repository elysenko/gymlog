"""jwt_session auth glue (platform stack contract): Bearer tokens signed with
JWT_SECRET; protected routes depend on get_current_user."""
import os
import time

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

_DEV_SECRET = "dev-secret-change-me"
_ENV = (os.environ.get("ENV") or os.environ.get("ENVIRONMENT") or "development").lower()
_IS_PROD = _ENV in {"prod", "production"}

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    if _IS_PROD:
        # Per the plan's risk note: a real deployment MUST set JWT_SECRET. Fail
        # fast rather than sign tokens with a well-known dev secret in production.
        raise RuntimeError(
            "JWT_SECRET is required in production (ENV/ENVIRONMENT=production) "
            "but is not set. Refusing to start."
        )
    # Local/dev convenience only.
    JWT_SECRET = _DEV_SECRET

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return _pwd.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd.verify(password, password_hash)


def sign_token(user: User) -> str:
    return jwt.encode(
        {"sub": str(user.id), "email": user.email, "role": user.role, "iat": int(time.time())},
        JWT_SECRET,
        algorithm="HS256",
    )


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    user = db.execute(select(User).where(User.id == int(payload["sub"]))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="Unknown user")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    """RolesGuard analogue: 403 unless the authenticated user is an ADMIN."""
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user
