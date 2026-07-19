# GymLog

A full-stack workout tracker: log gym sessions, manage a personal exercise
library, and track personal records (PRs). Built as a **FastAPI + SQLAlchemy +
PostgreSQL** JWT-authenticated API serving a **React (Vite + TypeScript)** SPA.

Deployed as two services (per `colossus.yaml`): a `backend` FastAPI container
(port `3000`, all routes under `/api`) and a `web` nginx container (port `80`)
that serves the built SPA and proxies `/api` to the backend.

## Features

- Email/password auth (signup, login, logout) with JWT bearer tokens and route guards.
- User-scoped exercise library with muscle-group filtering.
- Multi-step session logging (date → exercises → sets of reps/weight).
- Workout history (newest-first) and per-exercise PR board (derived at read time).
- Admin-only user list.

## Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+ (or Docker, via `docker-compose.yml`)

## Environment variables

| Variable       | Required | Description                                                            |
| -------------- | -------- | ---------------------------------------------------------------------- |
| `DATABASE_URL` | **yes**  | Postgres URL, e.g. `postgresql://postgres:postgres@localhost:5432/gymlog`. The backend **fails fast** if unset. |
| `JWT_SECRET`   | prod     | Secret used to sign JWTs. A dev fallback is used only when `ENV`/`ENVIRONMENT` is not `production`; **required** in production. |
| `ENV`          | no       | `development` (default) or `production`. In `production`, `JWT_SECRET` is mandatory. |
| `PORT`         | no       | Backend listen port (default `3000`).                                  |

## Local development

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gymlog
export JWT_SECRET=dev-secret-change-me

python -m app.init_db   # create tables
python seed.py          # seed demo users + starter exercises
uvicorn app.main:app --reload --port 3000
```

API is served under `http://localhost:3000/api` (health: `GET /api/health`).

### Frontend (React + Vite)

```bash
cd web
npm install
npm run dev
```

The Vite dev server proxies `/api` to the backend. Build for production with
`npm run build` (outputs to `web/dist`).

## Docker / local parity

`docker-compose.yml` spins up Postgres plus the two deployed services:

```bash
docker compose up --build
# web UI  -> http://localhost:8080
# backend -> http://localhost:3000/api/health
```

This mirrors the two-service `colossus.yaml` topology used in deployment, where
`DATABASE_URL`, `JWT_SECRET`, and other backing-service credentials are injected
from the platform `infra-secrets` secret. The backend container runs
`init_db` + `seed.py` before serving.

## Seeded demo credentials

| Role  | Email               | Password       |
| ----- | ------------------- | -------------- |
| ADMIN | `admin@gymlog.dev`  | `Password123!` |
| USER  | `user@gymlog.dev`   | `Password123!` |

> ⚠️ These demo credentials are for evaluation only. **Change or remove them
> before any real use** — rotate `JWT_SECRET` and delete/replace the seeded
> accounts.
