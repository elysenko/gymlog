"""FastAPI app entry. Serve contract: uvicorn on PORT=3000 behind the nginx /api proxy
(web/nginx.conf strips nothing — all routes here are mounted under /api). Keep
GET /api/health intact: the platform's backend reachability probe depends on it.

Feature routers live in app.routers.*; each carries its own /api... prefix, matching
the platform proxy contract. Request-validation errors are normalized to HTTP 400
(FastAPI's default is 422) to match the surface contract's documented statuses.
"""
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routers import admin, auth, exercises, health, records, sessions

app = FastAPI(title="app-backend", docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Surface contract documents body/param validation failures as 400, not 422.
    return JSONResponse(status_code=400, content=jsonable_encoder({"detail": exc.errors()}))


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(exercises.router)
app.include_router(sessions.router)
app.include_router(records.router)
app.include_router(admin.router)
