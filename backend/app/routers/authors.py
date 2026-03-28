"""Authors router."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.author import Author
from app.schemas.author import AuthorOut

router = APIRouter(prefix="/authors", tags=["authors"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[AuthorOut], summary="List authors")
async def list_authors(
    db: DB,
    q: str | None = Query(None, description="Name search"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
) -> list[AuthorOut]:
    stmt = select(Author).order_by(Author.name)
    if q:
        stmt = stmt.where(Author.name.ilike(f"%{q}%"))
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    authors = (await db.execute(stmt)).scalars().all()
    return [AuthorOut.model_validate(a) for a in authors]


@router.get("/{author_id}", response_model=AuthorOut, summary="Author detail")
async def get_author(
    author_id: Annotated[uuid.UUID, Path()],
    db: DB,
) -> AuthorOut:
    author = await db.get(Author, author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    return AuthorOut.model_validate(author)
