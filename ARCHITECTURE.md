# Architecture

## Requested stack
`fastapi-react` — fixed by the platform at app creation. (The scope plan referenced NestJS + Prisma; per the scaffolder's stack contract, the platform-fixed stack always wins for scaffolding — the plan's *features* — auth, exercises, sessions, records, admin — get implemented on top of this FastAPI + React SPA stack by the coder.)

## Newly scaffolded (this run)
The project directory only contained `README.md`, `.git/`, and `.github/` before this run — everything below is new, copied from `template-fastapi-react`.

- **`backend/`** — FastAPI + SQLAlchemy Python backend.
  - `backend/app/main.py` — FastAPI app, `GET /api/health`, `POST /api/auth/login`, `GET /api/auth/me`.
  - `backend/app/models.py`, `backend/app/database.py`, `backend/app/auth.py`, `backend/app/init_db.py`.
  - `backend/seed.py` — seed script.
  - `backend/requirements.txt` — fastapi, uvicorn, sqlalchemy, psycopg2-binary, pyjwt, passlib[bcrypt].
  - `backend/Dockerfile` — backend container image, listens on port 3000.
- **`web/`** — Vite + React + TypeScript SPA.
  - `web/src/App.tsx` — route shell (`data-testid="app-ready"` — required by the Colossus render gate, do not remove).
  - `web/src/pages/Home.tsx`, `web/src/pages/Login.tsx` — stub pages to replace with the real GymLog UI.
  - `web/src/lib/api.ts` — fetch helper.
  - `web/vite.config.ts`, `web/nginx.conf`, `web/Dockerfile.frontend` — build/serve config.
- **`colossus.yaml`** — build manifest: `framework: react`, SPA served on port 80 via nginx with `spa-fallback`, backend on port 3000 (`backend/Dockerfile`).
- **`.colossus-acceptance.json`** — acceptance contract for the post-deploy render gate (`ready_testid: app-ready`; `reject_signatures` seeded with the template's stub "Welcome" / health-check placeholder text — the coder must not leave these in place).
- **`ATLAS_STACK.md`** — recorded verdict: GREENFIELD.

## Next steps for the developer / coder agent
1. Implement the GymLog domain on the FastAPI + SQLAlchemy backend: `User`/`Role`, `Exercise`, `WorkoutSession`, `SessionExercise`, `SetEntry` models (translate the plan's Prisma schema into SQLAlchemy models + Alembic or `init_db.py`-style migrations).
2. Add JWT signup, exercises CRUD, sessions CRUD (nested create in a transaction), records (PR) derivation, and an admin/users endpoint, all under the existing `/api` prefix in `backend/app/main.py` (split into routers as the app grows).
3. Set required env vars: `DATABASE_URL` (Postgres), `JWT_SECRET` — no `.env.example` ships with this template; add one alongside real config.
4. Build out the React SPA: replace `Home.tsx`/`Login.tsx` stubs with the full route tree (`/login`, `/signup`, `/history`, `/exercises`, `/sessions/new`, `/sessions/:id`, `/records`, `/admin/users`), an `AuthContext`, and guarded routes, per the plan.
5. Update `web/src/App.tsx`'s real front-page text into `.colossus-acceptance.json`'s `expect_text`, and remove the stub `reject_signatures` once the real UI replaces "Welcome"/health-check placeholder text.
6. Local dev: run backend with `uvicorn` (`pip install -r backend/requirements.txt`) and `npm install && npm run dev` in `web/`; wire a local Postgres (`docker-compose` not yet present — add one for local dev, e.g. with a `postgres` service and `DATABASE_URL` pointed at it).
7. Deploy: Colossus builds via `colossus.yaml` — SPA image serves `web/dist` on port 80 with nginx SPA fallback; backend image builds from `backend/Dockerfile` on port 3000.

## Template sources
- `template-fastapi-react/backend` → `backend/`
- `template-fastapi-react/web` → `web/`
