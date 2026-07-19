# Test Specification

> ⚠️ **Warning:** `.pipeline/surface.json` was not found. The API surface below was
> derived from the "Surface contract" section of `.pipeline/tasks.md` and the approved
> spec. If `surface.json` is later produced, re-reconcile this file against it.
>
> Note: `.pipeline/tasks.md` extends the base spec with three admin endpoints
> (`GET/PATCH /api/admin/settings`) and a `minio` credential row that the product spec
> does not mention. Those are covered as API tests for completeness but the `minio`
> storage feature and the `/admin/settings` UI are treated cautiously (see **Out of scope**).

## Coverage summary
- Total cases: 74
- API endpoints covered: 17 / 17
- User journeys covered: 11

## API tests

Conventions: all routes carry the global `/api` prefix. "Authenticated" means a valid
`Authorization: Bearer <jwt>` header for a USER-role token unless stated. "ADMIN" means an
ADMIN-role token. Seeded accounts: `admin@gymlog.dev` (ADMIN) / `user@gymlog.dev` (USER),
password `Password123!`.

### `GET /api/health`
- **Happy path**: no auth, no body → `200` with body `{status:'ok'}`.
- **Auth failures**: none — route is public; a request with no token still returns `200`.

### `GET /api/health/deep`
- **Happy path**: DB reachable → `200` with a body reporting DB status up (e.g. `{status:'ok', db:'up'}`) after executing `SELECT 1`.
- **Edge cases**: DB unreachable → non-200 (e.g. `503`) or body reporting `db:'down'`; route remains public (no token required).

### `POST /api/auth/signup`
- **Happy path**: `{email:'new@gymlog.dev', password:'Password123!'}` (email not already used) → `201`/`200` with a JWT token in the body; the created user has role `USER` (never ADMIN).
- **Validation failures**: missing email → `400`; malformed email (`'notanemail'`) → `400`; missing/empty password → `400`; password failing policy (if enforced) → `400`.
- **Idempotency / edge cases**: signup with an already-registered email (e.g. `user@gymlog.dev`) → `409`/`400` (duplicate), no second user created; decoded JWT payload contains `{sub, email, role:'USER'}`.

### `POST /api/auth/login`
- **Happy path**: `{email:'user@gymlog.dev', password:'Password123!'}` → `200`/`201` with a JWT whose payload is `{sub, email, role:'USER'}`; ADMIN creds return `role:'ADMIN'`.
- **Validation failures**: missing email or password → `400`.
- **Auth failures**: correct email + wrong password → `401`; unknown email → `401`. Error message must not reveal which field was wrong.

### `GET /api/auth/me`
- **Happy path**: valid USER token → `200` with current user `{id, email, role, createdAt}` and **no** `passwordHash` field.
- **Auth failures**: no token → `401`; malformed/expired token → `401`.

### `GET /api/exercises`
- **Happy path**: authenticated → `200` with an array of only the caller's own exercises.
- **Validation failures**: `?muscleGroup=legs` filter returns only legs exercises; filter is **case-insensitive** (`?muscleGroup=LEGS` and `?muscleGroup=Legs` return the same set); a filter matching nothing → `200` with `[]`.
- **Auth failures**: no token → `401`.
- **Idempotency / edge cases**: user A cannot see user B's exercises (scoping by `req.user.sub`).

### `POST /api/exercises`
- **Happy path**: `{name:'Barbell Squat', muscleGroup:'legs', equipment:'barbell'}` → `201` with created exercise owned by the caller.
- **Validation failures**: empty `name` → `400`; empty `muscleGroup` → `400`; empty `equipment` → `400`; unknown/extra fields stripped by `whitelist` (no error but not persisted).
- **Auth failures**: no token → `401`.

### `PATCH /api/exercises/:id`
- **Happy path**: owner updates `{name:'Back Squat'}` → `200` with updated fields.
- **Validation failures**: empty `name` in body → `400`.
- **Auth failures**: no token → `401`.
- **Idempotency / edge cases**: patching another user's exercise id → `403`/`404` (not modified); non-existent id → `404`.

### `DELETE /api/exercises/:id`
- **Happy path**: owner deletes own exercise → `200`/`204`; subsequent `GET /api/exercises` no longer lists it.
- **Auth failures**: no token → `401`.
- **Edge cases**: deleting another user's exercise → `403`/`404`; non-existent id → `404`.

### `GET /api/sessions`
- **Happy path**: authenticated → `200` with an array of the caller's sessions, each entry containing `date` and `exerciseCount` (integer).
- **Edge cases**: ordering is newest `date` first, tiebroken by `createdAt` descending (verify with two sessions sharing a date); user with no sessions → `[]`; sessions are user-scoped (A cannot see B's).
- **Auth failures**: no token → `401`.

### `POST /api/sessions`
- **Happy path**: `{date:'2026-07-19', exercises:[{exerciseId:<owned squat id>, sets:[{reps:5,weight:100},{reps:5,weight:100},{reps:5,weight:100}]}]}` → `201`; persists one WorkoutSession + one SessionExercise + three SetEntry rows with `setNumber` auto-numbered `1,2,3`; all created atomically in one transaction.
- **Validation failures**: missing `date` → `400`; empty `exercises` (if disallowed) → `400`; a set with missing/negative `reps` or `weight` → `400`.
- **Auth failures**: no token → `401`.
- **Idempotency / edge cases**: `exerciseId` not owned by caller → `403`/`400` and **no** partial rows written (transaction rolls back entirely).

### `GET /api/sessions/:id`
- **Happy path**: owner → `200` with full nested detail: session `{id,date}` → exercises (with order) → sets (`setNumber, reps, weight`).
- **Auth failures**: no token → `401`.
- **Edge cases**: another user's session id → `403`/`404`; non-existent id → `404`.

### `DELETE /api/sessions/:id`
- **Happy path**: owner deletes → `200`/`204`; cascade removes the session's SessionExercise + SetEntry rows; session no longer in `GET /api/sessions`.
- **Auth failures**: no token → `401`.
- **Edge cases**: another user's session id → `403`/`404`; non-existent id → `404`.

### `GET /api/records`
- **Happy path**: authenticated → `200` with `[{exerciseId, name, muscleGroup, bestWeight, achievedOn}]` sorted by `name` ascending; `bestWeight` = max `weight` across all the user's set entries for that exercise; `achievedOn` = the `date` of the session where that max was set.
- **Edge cases**: user with no sets → `[]`; after logging a heavier set than a prior best, `bestWeight` increases and `achievedOn` reflects the newer session's date; records are user-scoped; derived at read time (no stored PR row).
- **Auth failures**: no token → `401`.

### `GET /api/admin/users`
- **Happy path**: ADMIN token → `200` with all users, each minus `passwordHash`, including per-user counts.
- **Auth failures**: no token → `401`; **USER** token → `403`.

### `GET /api/admin/settings`
- **Happy path**: ADMIN token → `200` listing service keys (`postgresql`, `minio`) with **masked** values and a `configured` boolean per service.
- **Auth failures**: no token → `401`; USER token → `403`.

### `PATCH /api/admin/settings`
- **Happy path**: ADMIN token with `{<key>:<value>}` pairs → `200`; upserts the SystemSetting rows; a follow-up `GET` reports the service as `configured:true` with the value masked.
- **Validation failures**: malformed body (non-object / disallowed keys) → `400`.
- **Auth failures**: no token → `401`; USER token → `403`.

## UI / journey tests

### Journey: Login
- **Steps**: navigate `/login` → type `user@gymlog.dev` / `Password123!` → submit.
- **Expected outcomes**: token stored in `localStorage`; redirect to `/history`; nav shows logged-in chrome (logout visible).
- **Negative path**: wrong password → stays on `/login`, shows an error message, no token stored.

### Journey: Signup
- **Steps**: navigate `/signup` → enter a new email + valid password → submit.
- **Expected outcomes**: new USER account created, token stored, redirect to `/history`.
- **Negative path**: duplicate email or invalid input → inline error, remains on `/signup`, no token stored.

### Journey: Logout
- **Steps**: while authenticated, click logout in `Layout` nav.
- **Expected outcomes**: token cleared from `localStorage`; redirect to `/login`; visiting a guarded route afterward redirects back to `/login`.

### Journey: Route guards (unauthenticated + role)
- **Steps**: with no token, directly visit `/history`, `/exercises`, `/sessions/new`, `/records`; then with a USER token visit `/admin/users`.
- **Expected outcomes**: each unauthenticated guarded route redirects to `/login`; `RequireAdmin` route `/admin/users` with a USER token is blocked (redirect/denied); `/` redirects to `/history` when authenticated.
- **Negative path**: expired token triggers client 401 handling → token cleared and redirect to `/login`.

### Journey: View workout history
- **Steps**: log in as USER → land on `/history`.
- **Expected outcomes**: sessions listed newest-first showing date + exercise count; each row links to `/sessions/:id`; a "Log session" CTA links to `/sessions/new`.
- **Negative path**: no sessions → empty-state message; API error → error state; while fetching → loading state.

### Journey: Manage exercise library
- **Steps**: navigate `/exercises` → add `Barbell Squat` (muscleGroup `legs`, equipment `barbell`) → then set muscle filter to `legs` (bound to `?muscle=legs`).
- **Expected outcomes**: new exercise appears in the list; `?muscle=legs` filter shows Barbell Squat; changing the filter updates the URL query param and the list; empty/loading/error states render appropriately.
- **Negative path**: submitting the add form with an empty field shows validation feedback and does not create an exercise.

### Journey: Log a session (wizard)
- **Steps**: navigate `/sessions/new` → step 1 pick date → step 2 add Barbell Squat → step 3 add 3 sets of 5 reps @ 100kg → submit.
- **Expected outcomes**: `POST /api/sessions` called with nested payload; on success redirect to `/history` (or the new session detail) and the session appears; wizard step is reflected in `?step=` and restored on reload.
- **Negative path**: submitting with no exercises/sets shows validation; server error keeps entered data and shows an error.

### Journey: View & delete a session
- **Steps**: from `/history` open a session → view nested sets → click delete.
- **Expected outcomes**: `/sessions/:id` shows exercises with their sets (setNumber, reps, weight); delete removes it and returns to `/history` where it no longer appears; reloading the page confirms persistence before deletion (DB-backed).
- **Negative path**: opening a non-existent/foreign session id shows a not-found/denied state.

### Journey: Records / PR board
- **Steps**: navigate `/records` after logging squat sessions.
- **Expected outcomes**: board lists each exercise with best weight and the date achieved, sorted by name; logging a heavier squat and reloading shows the updated best weight + new date.
- **Negative path**: no logged sets → empty-state message; API error → error state.

### Journey: Admin users
- **Steps**: log in as `admin@gymlog.dev` → navigate `/admin/users`.
- **Expected outcomes**: table of all users with counts renders; admin-only nav links are visible for ADMIN.
- **Negative path**: a USER navigating to `/admin/users` is redirected/denied and never sees the admin nav links.

### Journey: Admin settings
- **Steps**: as ADMIN navigate `/admin/settings` → view `postgresql` / `minio` rows → submit a credential value for one service.
- **Expected outcomes**: each service shows a configured/unconfigured badge; saving calls `PATCH /api/admin/settings` and the badge flips to configured with the value masked.
- **Negative path**: USER cannot reach `/admin/settings` (RequireAdmin redirect).

## Data integrity tests
- After `POST /api/sessions`, exactly one WorkoutSession, one SessionExercise per submitted exercise, and one SetEntry per submitted set exist; `setNumber` values are contiguous starting at 1 per SessionExercise.
- A failed session create (unowned exerciseId / validation error) leaves **zero** new rows (transaction atomicity).
- Deleting a WorkoutSession cascade-deletes its SessionExercise and SetEntry rows (no orphans).
- Deleting a user's data never affects another user's rows (user scoping enforced by `userId`).
- `User.email` is unique — a second insert with the same email is rejected at the DB level.
- `passwordHash` is never returned by any API response (`/auth/me`, `/admin/users`).
- `bestWeight`/`achievedOn` in `/api/records` are always consistent with the underlying SetEntry rows (derived, never stale).
- Seed is idempotent: running it twice yields the same two demo users (no duplicates) and starter exercises.

## Out of scope
- **`minio` / object storage feature** — the product spec references no uploads or files; `minio` appears only as a credential row from `tasks.md`. Only the settings-row rendering and `GET/PATCH /api/admin/settings` behaviour are tested; no storage functionality is exercised (spec is silent on it).
- **`/admin/settings` UI depth** — tested only for guard + configured/masked behaviour; the exact credential fields per service are not asserted (spec does not define them).
- **Docker build / deploy pipeline** (`docker build`, `prisma migrate deploy` at container start, SPA served at `/` and API at `/api`) — an infra/CI concern verified outside this functional test suite; noted here as a deploy smoke check rather than a unit/integration case.
- **JWT expiry duration, CORS specifics, and rate limiting** — the spec does not specify concrete values, so exact thresholds are not asserted (only presence of 401 on invalid/missing tokens is tested).
- **`muscleGroup`/`equipment` as constrained selects vs free text** — spec treats them as free strings with suggested enums; tests assert non-empty validation only, not enum membership (open question in `tasks.md`).

Wrote .pipeline/test_spec.md (74 cases across 17 endpoints / 11 journeys).
