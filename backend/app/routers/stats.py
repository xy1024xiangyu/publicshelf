"""Stats router – aggregate platform statistics."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.book import Book
from pydantic import BaseModel

router = APIRouter(prefix="/stats", tags=["stats"])

DB = Annotated[AsyncSession, Depends(get_db)]


class LanguageStat(BaseModel):
    language: str
    count: int


class StatsOut(BaseModel):
    total_books: int
    total_downloads: int
    by_language: list[LanguageStat]
    recent_additions: list[dict]


@router.get("", response_model=StatsOut, summary="Platform statistics")
async def get_stats(db: DB) -> StatsOut:
    # Total approved books
    total_books_result = await db.execute(
        select(func.count()).where(Book.is_approved == True)  # noqa: E712
    )
    total_books: int = total_books_result.scalar_one()

    # Total downloads
    total_dl_result = await db.execute(
        select(func.coalesce(func.sum(Book.downloads), 0)).where(Book.is_approved == True)  # noqa: E712
    )
    total_downloads: int = total_dl_result.scalar_one()

    # Books by language
    lang_result = await db.execute(
        select(Book.language, func.count().label("count"))
        .where(Book.is_approved == True)  # noqa: E712
        .group_by(Book.language)
        .order_by(func.count().desc())
    )
    by_language = [
        LanguageStat(language=row.language, count=row.count)
        for row in lang_result.all()
    ]

    # 5 most recently added approved books (lightweight)
    recent_result = await db.execute(
        select(Book.slug, Book.title, Book.language, Book.year_published, Book.created_at)
        .where(Book.is_approved == True)  # noqa: E712
        .order_by(Book.created_at.desc())
        .limit(5)
    )
    recent_additions = [
        {
            "slug": row.slug,
            "title": row.title,
            "language": row.language,
            "year_published": row.year_published,
            "created_at": row.created_at.isoformat(),
        }
        for row in recent_result.all()
    ]

    return StatsOut(
        total_books=total_books,
        total_downloads=total_downloads,
        by_language=by_language,
        recent_additions=recent_additions,
    )
