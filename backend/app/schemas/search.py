"""Pydantic schemas for search."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.book import BookListOut


class SearchResult(BaseModel):
    query: str
    total: int
    page: int
    per_page: int
    items: list[BookListOut]
    source: str  # "azure" | "postgres"
