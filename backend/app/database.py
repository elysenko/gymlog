"""SQLAlchemy 2.x engine/session wiring. DATABASE_URL is injected by the platform
(postgresql://...). Tables are created at container boot (Dockerfile CMD runs
app.init_db) — never at import time."""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    # Fail fast: never silently connect to a non-existent local DB. The platform
    # injects DATABASE_URL from infra-secrets; an unset value is a misconfiguration.
    raise RuntimeError(
        "DATABASE_URL is not set. It must be injected by the platform "
        "(postgresql://user:pass@host:port/db). Refusing to start."
    )

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
