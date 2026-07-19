"""Demo seed. PLATFORM CONTRACT: print one `SEED_CRED <ROLE> <email> <password>` line per
demo account AND a single `SEED_CREDS_JSON [...]` line — the deploy parses stdout into
the deployment's demo credentials. Idempotent (upsert by email).

Also seeds a handful of starter exercises for the demo USER so the exercise library,
session-logging, and PR board have data to show on first login.
"""
import json

from sqlalchemy import select

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import Exercise, User

DEMO_USERS = [
    {"role": "ADMIN", "email": "admin@gymlog.dev", "password": "Password123!", "name": "Demo Admin"},
    {"role": "USER", "email": "user@gymlog.dev", "password": "Password123!", "name": "Demo User"},
]

STARTER_EXERCISES = [
    {"name": "Barbell Squat", "muscle_group": "legs", "equipment": "barbell"},
    {"name": "Bench Press", "muscle_group": "chest", "equipment": "barbell"},
    {"name": "Deadlift", "muscle_group": "back", "equipment": "barbell"},
    {"name": "Overhead Press", "muscle_group": "shoulders", "equipment": "barbell"},
    {"name": "Pull Up", "muscle_group": "back", "equipment": "bodyweight"},
    {"name": "Dumbbell Curl", "muscle_group": "arms", "equipment": "dumbbell"},
]


def main() -> None:
    Base.metadata.create_all(bind=engine)
    creds = []
    with SessionLocal() as db:
        users_by_email: dict[str, User] = {}
        for u in DEMO_USERS:
            existing = db.execute(select(User).where(User.email == u["email"])).scalar_one_or_none()
            if existing is None:
                existing = User(
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                    name=u["name"],
                )
                db.add(existing)
            else:
                # Re-assert the password + role on every seed run so the stored hash can
                # never drift from the SEED_CRED line the deploy records (idempotent upsert).
                existing.password_hash = hash_password(u["password"])
                existing.role = u["role"]
                existing.name = u["name"]
            users_by_email[u["email"]] = existing
            print(f"SEED_CRED {u['role']} {u['email']} {u['password']}")
            creds.append({"role": u["role"], "email": u["email"], "password": u["password"]})
        db.flush()  # assign ids to any newly-added users

        demo_user = users_by_email["user@gymlog.dev"]
        for ex in STARTER_EXERCISES:
            already = db.execute(
                select(Exercise).where(
                    Exercise.user_id == demo_user.id, Exercise.name == ex["name"]
                )
            ).scalar_one_or_none()
            if already is None:
                db.add(Exercise(user_id=demo_user.id, **ex))

        db.commit()
    print(f"SEED_CREDS_JSON {json.dumps(creds)}")


if __name__ == "__main__":
    main()
