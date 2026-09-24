"""CYBERGUARD backend entrypoint.

Development:
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Production (frontend built into the same container):
    npm --prefix frontend run build
    CYBERGUARD_STATIC=../frontend/dist uvicorn main:app --host 0.0.0.0 --port 8000

Docs at /docs.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api.routes import router
from seed import seed_demo_events


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fills the dashboard with 24 hours of history so the demo opens on a
    # populated board. Set CYBERGUARD_SEED=0 for an empty start.
    if os.getenv("CYBERGUARD_SEED", "1") == "1":
        seed_demo_events()
    yield


app = FastAPI(
    title="CYBERGUARD",
    description="AI-powered cyber threat, phishing and digital impersonation detection and response",
    version="0.6.0",
    lifespan=lifespan,
)

# Only needed when the frontend is served from a different origin. When the
# built frontend is served by this app (CYBERGUARD_STATIC), requests are
# same-origin and none of this applies.
_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CYBERGUARD_ORIGINS", _default_origins).split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


# --------------------------------------------------------------------------
# Optionally serve the built frontend from this same app.
#
# Set CYBERGUARD_STATIC to the Vite build output (frontend/dist). Everything
# that is not /api or /docs falls through to index.html so client-side routes
# like /incidents survive a page refresh.
# --------------------------------------------------------------------------
_static = os.getenv("CYBERGUARD_STATIC", "")
_static_dir = (Path(__file__).resolve().parent / _static).resolve() if _static else None

if _static_dir and _static_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=_static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        candidate = (_static_dir / full_path).resolve()
        if full_path and candidate.is_file() and _static_dir in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(_static_dir / "index.html")

else:

    @app.get("/")
    async def root():
        return {
            "service": "CYBERGUARD",
            "docs": "/docs",
            "dashboard_api": "/api/stats",
            "note": "Set CYBERGUARD_STATIC=../frontend/dist to serve the dashboard from here.",
        }
