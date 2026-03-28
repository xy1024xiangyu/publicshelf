"""OpenShelf – FastAPI application entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.routers import authors, books, search, stats, submissions

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("openshelf")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup + shutdown hooks."""
    logger.info("OpenShelf API starting up…")
    # Connection pool is created lazily by SQLAlchemy; nothing explicit needed.
    yield
    logger.info("OpenShelf API shutting down…")
    await engine.dispose()


app = FastAPI(
    title="OpenShelf API",
    description="Multilingual public-domain book library",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(books.router)
app.include_router(authors.router)
app.include_router(search.router)
app.include_router(submissions.router)
app.include_router(stats.router)


@app.get("/health", tags=["meta"], summary="Health check")
async def health() -> dict[str, str]:
    return {"status": "ok"}
