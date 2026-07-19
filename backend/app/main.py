"""FastAPI app entry. Serve contract: uvicorn on PORT=3000 behind the nginx /api proxy
(web/nginx.conf strips nothing — all routes here are mounted under /api). Keep
GET /api/health intact: the platform's backend reachability probe depends on it.

Routes are split into routers (app/routers/*) as the app grew: auth, exercises,
sessions, records, admin users, and health. Pydantic schemas enforce request
validation (the class-validator/ValidationPipe equivalent for this stack).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, exercises, health, records, sessions, users

app = FastAPI(title="app-backend", docs_url="/api/docs", openapi_url="/api/openapi.json")

# Same-origin in production (nginx proxies /api). CORS stays permissive so the vite
# dev-server and any preview host can call the API directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(exercises.router)
app.include_router(sessions.router)
app.include_router(records.router)
app.include_router(users.router)
