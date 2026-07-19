# GymLog — Workout Tracker

A full-stack workout tracker: a **FastAPI + SQLAlchemy + PostgreSQL** JWT-authenticated
API serving a **React (Vite + TypeScript)** single-page app.

- Sign in with email/password (two seeded demo accounts).
- Build a personal exercise library and filter it by muscle group.
- Log workout sessions (date + per-exercise sets of reps × weight); persisted and shown
  in history, newest first, with an exercise count.
- Automatic Personal-Records board: best weight per exercise and the date it was hit.
- Admin view of all users.

Every screen is deep-linkable (its own URL), so history, the PR board, a specific session,
and filtered exercise lists can all be bookmarked or shared.

## Layout

```
backend/   FastAPI app (app/), SQLAlchemy models, seed.py, Dockerfile
web/        React + Vite SPA (src/), nginx.conf, Dockerfile.frontend
```

## Environment variables

| Var            | Required | Purpose                                                        |
|----------------|----------|----------------------------------------------------------------|
| `DATABASE_URL` | yes      | `postgresql://user:pass@host:5432/db` — injected by the platform |
| `JWT_SECRET`   | prod     | HS256 signing secret for auth tokens (dev falls back to a default) |
| `PORT`         | no       | API listen port (defaults to 3000 in the container)            |

## Run locally

Backend (Python 3.11+):

```bash
cd backend
pip install -r requirements.txt
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app"
export JWT_SECRET="dev-secret"
python -m app.init_db     # create tables (idempotent)
python seed.py            # seed demo users + starter exercises (idempotent)
uvicorn app.main:app --reload --port 3000
```

Frontend (Node 20+):

```bash
cd web
npm install --include=dev
npm run dev               # Vite dev server, proxies /api -> http://localhost:3000
```

## Build & deploy

Each service ships its own Dockerfile. On boot the backend container ensures the schema
(`app.init_db`) and seeds demo data, then serves under `/api`; nginx serves the SPA and
proxies `/api` to the backend. `DATABASE_URL` must be provided by the deployment.

## Demo credentials

| Role  | Email               | Password       |
|-------|---------------------|----------------|
| ADMIN | `admin@gymlog.dev`  | `Password123!` |
| USER  | `user@gymlog.dev`   | `Password123!` |

> ⚠️ These seeded demo credentials are for convenience only — **change them before any
> real-world use.**

## API surface

- `GET  /api/health`, `GET /api/health/deep` — liveness / DB check
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST/PATCH/DELETE /api/exercises` (`?muscleGroup=`) — user-scoped library
- `GET/POST /api/sessions`, `GET/DELETE /api/sessions/{id}` — workout sessions
- `GET /api/records` — derived personal records (best weight + date per exercise)
- `GET /api/admin/users` — ADMIN-only user list
