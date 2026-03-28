"""Books router – list, detail, download."""

from __future__ import annotations

import uuid
from typing import Annotated
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.book import Book
from app.models.genre import Genre
from app.schemas.book import BookListOut, BookOut, PaginatedBooks

router = APIRouter(prefix="/books", tags=["books"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=PaginatedBooks, summary="List books with optional filters")
async def list_books(
    db: DB,
    language: str | None = Query(None, description="ISO 639-1 language code"),
    year_min: int | None = Query(None, ge=0, le=2100),
    year_max: int | None = Query(None, ge=0, le=2100),
    genre: str | None = Query(None, description="Genre slug"),
    source: str | None = Query(None, description="gutenberg | aozora | archive | author_submitted"),
    license: str | None = Query(None, description="public_domain | cc0 | cc_by | cc_by_sa"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
) -> PaginatedBooks:
    stmt = (
        select(Book)
        .where(Book.is_approved == True)  # noqa: E712
        .options(
            selectinload(Book.authors),
            selectinload(Book.genres),
        )
        .order_by(Book.downloads.desc(), Book.created_at.desc())
    )

    if language:
        stmt = stmt.where(Book.language == language)
    if year_min is not None:
        stmt = stmt.where(Book.year_published >= year_min)
    if year_max is not None:
        stmt = stmt.where(Book.year_published <= year_max)
    if source:
        stmt = stmt.where(Book.source == source)
    if license:
        stmt = stmt.where(Book.license == license)
    if genre:
        stmt = stmt.join(Book.genres).where(Genre.slug == genre)

    # Count total (same filters, no pagination)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Apply pagination
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    books = (await db.execute(stmt)).scalars().all()

    return PaginatedBooks(
        total=total,
        page=page,
        per_page=per_page,
        items=[BookListOut.model_validate(b) for b in books],
    )


@router.get("/{slug}", response_model=BookOut, summary="Book detail")
async def get_book(
    slug: Annotated[str, Path(description="Book slug")],
    db: DB,
) -> BookOut:
    stmt = (
        select(Book)
        .where(Book.slug == slug, Book.is_approved == True)  # noqa: E712
        .options(
            selectinload(Book.authors),
            selectinload(Book.genres),
            selectinload(Book.translations),
        )
    )
    book = (await db.execute(stmt)).scalars().first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    return BookOut.model_validate(book)


@router.get(
    "/{slug}/download/{format}",
    summary="Redirect to signed download URL",
    response_class=RedirectResponse,
    status_code=302,
)
async def download_book(
    slug: Annotated[str, Path()],
    format: Annotated[str, Path(description="epub | txt | pdf | mobi")],
    db: DB,
) -> RedirectResponse:
    """Increment download counter and redirect to Azure Blob signed URL."""
    allowed_formats = {"epub", "txt", "pdf", "mobi"}
    if format not in allowed_formats:
        raise HTTPException(status_code=400, detail=f"Unknown format. Allowed: {allowed_formats}")

    stmt = select(Book).where(Book.slug == slug, Book.is_approved == True)  # noqa: E712
    book = (await db.execute(stmt)).scalars().first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    formats: dict = book.formats or {}
    blob_url: str | None = formats.get(format)
    if not blob_url:
        raise HTTPException(status_code=404, detail=f"Format '{format}' not available for this book")

    # Increment download counter (fire-and-forget style)
    book.downloads = (book.downloads or 0) + 1
    await db.commit()

    # If the stored URL is already a full URL (direct public blob), redirect as-is.
    # Otherwise treat it as a blob name and generate a signed URL.
    parsed = urlparse(blob_url)
    if parsed.scheme in ("http", "https"):
        return RedirectResponse(url=blob_url, status_code=302)

    # Generate a 1-hour SAS token for private blobs
    from app.services.storage_service import generate_signed_url  # avoid circular at module load
    signed = generate_signed_url(blob_url, expiry_hours=1)
    return RedirectResponse(url=signed, status_code=302)
