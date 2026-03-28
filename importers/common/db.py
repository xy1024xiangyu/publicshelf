"""Database helpers used by standalone importer scripts."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


def _db_url() -> str:
    return os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://openshelf:openshelf@localhost:5432/openshelf",
    )


_engine = None
_SessionLocal = None


def _init_engine() -> None:
    global _engine, _SessionLocal
    if _engine is None:
        _engine = create_async_engine(_db_url(), echo=False, pool_pre_ping=True)
        _SessionLocal = async_sessionmaker(
            bind=_engine, class_=AsyncSession, expire_on_commit=False
        )


@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    _init_engine()
    assert _SessionLocal is not None
    async with _SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def book_slug_exists(slug: str) -> bool:
    """Return True if a book with the given slug already exists."""
    from sqlalchemy import select, text

    _init_engine()
    assert _SessionLocal is not None
    async with _SessionLocal() as session:
        result = await session.execute(
            text("SELECT 1 FROM books WHERE slug = :slug LIMIT 1"), {"slug": slug}
        )
        return result.first() is not None
