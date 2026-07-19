# Pipeline Task Decomposition

## Summary
GymLog is a full-stack workout tracker: a NestJS + Prisma + PostgreSQL JWT-authenticated API serving a React (Vite/TypeScript) SPA from a single Docker image. Authenticated users manage a personal exercise library, log workout sessions (exercises → sets of reps/weight), and view derived personal records (PRs). Admins additionally see a users table. Uses `full_auth`: public signup/login/logout with route guards; first-class admin via seeded ADMIN account and role checks.

## Surface contract
**Public API routes**
- `GET /api/health` — liveness `{status:'ok'}`
- `GET /api/health/deep` — DB `SELECT 1` status
- `POST /api/auth/signup` — create USER, return JWT
- `POST /api/auth/login` — verify, return JWT

**Authenticated API routes** (JWT required)
- `GET /api/auth/me` — current user (no passwordHash)
- `GET /api/exercises?muscleGroup=` — list user-scoped exercises, optional case-insensitive filter
- `POST /api/exercises` — create user-scoped exercise
- `PATCH /api/exercises/:id` — update own exercise
- `DELETE /api/exercises/:id` — delete own exercise
- `GET /api/sessions` — list own sessions (newest date first, tiebreak createdAt), each with `date` + `exerciseCount`
- `POST /api/sessions` — nested create `{date, exercises:[{exerciseId, sets:[{reps, weight}]}]}` in one transaction, auto-numbering sets, validating exercise ownership
- `GET /api/sessions/:id` — full nested detail (exercises + sets)
- `DELETE /api/sessions/:id` — cascade delete
- `GET /api/records` — PR per exercise: `[{exerciseId, name, muscleGroup, bestWeight, achievedOn}]` sorted by name

**Admin API routes** (ADMIN role required)
- `GET /api/admin/users` — all users minus passwordHash, with counts
- `GET /api/admin/settings` — service/config keys with masked values + configured status
- `PATCH /api/admin/settings` — upsert key-value config pairs

**Web routes / screens**
| Path | Guard | flow node |
|---|---|---|
| `/login` | public | login |
| `/signup` | public | signup |
| `/history` | RequireAuth | history (post-login landing; `/` redirects here) |
| `/exercises` (`?muscle=`) | RequireAuth | exercise-library |
| `/sessions/new` (`?step=`) | RequireAuth | log-session |
| `/sessions/:id` | RequireAuth | session-detail |
| `/records` | RequireAuth | pr-board |
| `/admin/users` | RequireAdmin | admin-users |
| `/admin/settings` | RequireAdmin | admin-settings |

**Entities**
- `User{ id, email @unique, passwordHash, role Role, createdAt }`
- `Exercise{ id, userId, name, muscleGroup, equipment, createdAt }` (index `userId, muscleGroup`)
- `WorkoutSession{ id, userId, date, createdAt }`
- `SessionExercise{ id, sessionId, exerciseId, order }`
- `SetEntry{ id, sessionExerciseId, setNumber, reps, weight }`
- `SystemSetting{ key, value, updatedAt }`
- `enum Role{ USER ADMIN }`

## db_agent tasks
- [ ] Author `api/prisma/schema.prisma` with datasource (PostgreSQL via `DATABASE_URL`) and client generator.
- [ ] Define `enum Role { ADMIN USER }` and `User` model with `role Role @default(USER)`, `email @unique`, `passwordHash`, `createdAt` (full_auth model).
- [ ] Define `Exercise` model (`id, userId, name, muscleGroup, equipment, createdAt`) with a compound index on `(userId, muscleGroup)` and a relation to `User`.
- [ ] Define `WorkoutSession` model (`id, userId, date, createdAt`) with relation to `User`.
- [ ] Define `SessionExercise` model (`id, sessionId, exerciseId, order`) with cascade-delete relation from `WorkoutSession` and a relation to `Exercise`.
- [ ] Define `SetEntry` model (`id, sessionExerciseId, setNumber, reps, weight`) with cascade-delete relation from `SessionExercise`.
- [ ] Add `SystemSetting` model — `key String @id`, `value String`, `updatedAt DateTime @updatedAt` (admin settings backing store for provisioned services).
- [ ] Generate the initial Prisma migration reflecting all models and cascade rules.

## backend_agent tasks
- [ ] Scaffold `api/` NestJS project config: `package.json`, `tsconfig.json`, `nest-cli.json` with the dependency set from the spec.
- [ ] Implement `PrismaService` (`prisma.service.ts`, connect `onModuleInit`) + `prisma.module.ts`.
- [ ] Implement `main.ts` bootstrap: global `/api` prefix, CORS, `ValidationPipe({whitelist, transform})`, `ServeStaticModule` fallback to SPA `index.html` (excluding `/api/*`), listen on `$PORT` (default 8080); fail fast if `DATABASE_URL` absent.
- [ ] Wire `app.module.ts` with all feature modules + `ServeStaticModule` serving `../web/dist`.
- [ ] Implement `health.controller.ts`: `GET /api/health` liveness and `GET /api/health/deep` running `SELECT 1` reporting DB status.
- [ ] Implement auth module: `auth.service.ts` (bcrypt hash/verify, JWT sign `{sub,email,role}`), `auth.controller.ts` (`POST /api/auth/signup` → create USER, `POST /api/auth/login`, `GET /api/auth/me`), signup/login DTOs with class-validator.
- [ ] Implement `jwt.strategy.ts` (reads `JWT_SECRET`), `jwt-auth.guard.ts`, `roles.guard.ts` + `@Roles()` decorator; apply guards to all non-public controllers (full_auth: public = `/login`, `/signup`, `/api/health`, `/api/health/deep`).
- [ ] Implement exercises module: controller (`GET /api/exercises?muscleGroup=` case-insensitive, `POST`, `PATCH/:id`, `DELETE/:id`), service scoped to `req.user.sub`, DTOs validating non-empty `name`/`muscleGroup`/`equipment`.
- [ ] Implement sessions module: `POST /api/sessions` nested create in `prisma.$transaction` (validate exercise ownership, auto-number sets), `GET /api/sessions` (newest date first, tiebreak `createdAt`, include `exerciseCount`), `GET/:id` full nested detail, `DELETE/:id` cascade, DTOs.
- [ ] Implement records module: `GET /api/records` — join user's set entries to exercise + session, group by exercise, compute max weight + session date achieving it, return `[{exerciseId, name, muscleGroup, bestWeight, achievedOn}]` sorted by name (derived at read time).
- [ ] Implement admin users module: `GET /api/admin/users` (RolesGuard ADMIN) returning all users minus passwordHash with counts.
- [ ] Implement `lib/config.ts` with `resolveConfig(key)` — reads `process.env[key]`; if value equals `PLACEHOLDER_CONFIGURE_IN_SETTINGS` or absent, reads `SystemSetting` DB row; returns null if neither set.
- [ ] Implement admin settings endpoints: `GET /api/admin/settings` (list service keys for `postgresql` and `minio` with masked values + configured status) and `PATCH /api/admin/settings` (upsert key-value pairs, ADMIN required).
- [ ] Implement `api/prisma/seed.ts` — idempotently upsert demo `admin@gymlog.dev` (ADMIN) and `user@gymlog.dev` (USER), password `Password123!`, plus a handful of starter exercises for the USER account.

## ui_agent tasks
- [ ] Scaffold `web/` Vite + React + TS project: `package.json`, `vite.config.ts` (dev proxy `/api` → API), `tsconfig.json`, `index.html`, `src/main.tsx`, `src/styles.css` (minimal responsive).
- [ ] Implement `App.tsx` React Router route tree with guards for every route in the surface contract; `/` redirects to `/history`.
- [ ] Implement `auth/AuthContext.tsx` (token in `localStorage`, exposes `login/signup/logout/user`), `auth/RequireAuth.tsx`, `auth/RequireAdmin.tsx` (redirect to `/login` when unauthorized).
- [ ] Implement `Layout.tsx` — nav + logout; admin nav links (`/admin/users`, `/admin/settings`) visible only to ADMIN users.
- [ ] Implement `LoginPage.tsx` and `SignupPage.tsx` (public) — forms; on success store token and redirect to `/history`.
- [ ] Implement `HistoryPage.tsx` — list sessions newest-first with date + exercise count, link each to detail, "Log session" CTA; empty/loading/error states.
- [ ] Implement `ExercisesPage.tsx` — list + add form; muscle-group filter bound to `?muscle=` query param; empty/loading/error states.
- [ ] Implement `SessionNewPage.tsx` — multi-step wizard (pick date → add exercises → add sets reps/weight) with step restored from `?step=`; submit to create session.
- [ ] Implement `SessionDetailPage.tsx` — nested sets view + delete action.
- [ ] Implement `RecordsPage.tsx` — PR board (exercise, best weight, date); empty/loading/error states.
- [ ] Implement `AdminUsersPage.tsx` (RequireAdmin) — table of all users with counts.
- [ ] Implement `/admin/settings` page (RequireAdmin) — list `postgresql` and `minio` each with configured/unconfigured badge and per-service credential form wired to `GET`/`PATCH /api/admin/settings`.

## service_agent tasks
- [ ] Implement `web/src/api/client.ts` — fetch wrapper injecting `Authorization: Bearer` from stored token; on 401 clear token and redirect to `/login`.
- [ ] Add typed client calls for auth: signup, login, me.
- [ ] Add typed client calls for exercises: list (with `muscleGroup` filter), create, update, delete.
- [ ] Add typed client calls for sessions: list, create (nested payload), get by id, delete.
- [ ] Add typed client calls for records: get PR board.
- [ ] Add typed client calls for admin: list users, get settings, patch settings.

## tester tasks
- [ ] Auth: signup returns JWT; login with seeded USER lands on `/history`; guarded route without token redirects to `/login`.
- [ ] Auth roles: `GET /api/admin/users` with USER token → 403, with ADMIN token → 200.
- [ ] Exercises: add "Barbell Squat" (legs, barbell) → appears in library; `?muscle=legs` filter returns it.
- [ ] Sessions: log Barbell Squat 3×5 @ 100kg → appears in history; reload persists (DB-backed); history newest-first with correct exercise count; session detail shows nested sets; delete removes it.
- [ ] Records: log squat above prior best → `/api/records` shows new weight + correct session date.
- [ ] Health: `GET /api/health` → 200; `GET /api/health/deep` reports DB up.
- [ ] Deploy: `docker build` succeeds; container runs `prisma migrate deploy` + seed; SPA served at `/`, API at `/api`.

## Open questions
- Spec's `## Integrations` is "None (no third-party APIs/SDKs)" — the derived integration/env-key placeholder is treated as non-existent; no integration client modules are generated.
- `minio` appears in provisioned deployments but the spec never references object storage (no uploads/files in any scenario). It is surfaced only as a credential row on `/admin/settings`; downstream agents should not build storage features unless the spec is amended.
- `equipment` and `muscleGroup` are free strings with suggested enums (legs/chest/back/shoulders/arms/core; barbell/dumbbell/machine/bodyweight/cable) — confirm whether UI should offer these as constrained selects or free text.
