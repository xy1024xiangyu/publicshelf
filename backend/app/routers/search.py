"""Search router."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.search import SearchResult
from app.services import search_service

router = APIRouter(prefix="/search", tags=["search"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=SearchResult, summary="Full-text search across books")
async def search_books(
    db: DB,
    q: str = Query(..., min_length=1, description="Search query"),
    language: str | None = Query(None, description="ISO 639-1 language code"),
    decade: int | None = Query(None, description="Decade filter, e.g. 1920"),
    genre: str | None = Query(None, description="Genre slug"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
) -> SearchResult:
    result = await search_service.search(
        db,
        q,
        language=language,
        decade=decade,
        genre_slug=genre,
        page=page,
        per_page=per_page,
    )

    # The items from Azure Search are raw dicts; normalize them via the schema
    from app.schemas.book import BookListOut
    items = []
    for item in result["items"]:
        try:
            items.append(BookListOut.model_validate(item))
        except Exception:
            # Skip malformed hits rather than crashing the whole response
            continue

    return SearchResult(
        query=q,
        total=result["total"],
        page=page,
        per_page=per_page,
        items=items,
        source=result["source"],
    )
