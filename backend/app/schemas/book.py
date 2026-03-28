"""Pydantic schemas for Book, BookTranslation, Submission."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.author import AuthorOut


# ─────────────────────────────────────────────
# Shared enums as literals
# ─────────────────────────────────────────────

BookSource = Literal["gutenberg", "aozora", "archive", "author_submitted"]
BookLicense = Literal["public_domain", "cc0", "cc_by", "cc_by_sa"]
SubmissionStatus = Literal["pending", "approved", "rejected"]


# ─────────────────────────────────────────────
# Genre (lightweight – no circular dep)
# ─────────────────────────────────────────────

class GenreOut(BaseModel):
    id: int
    name: str
    slug: str
    language: str

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────
# BookTranslation
# ─────────────────────────────────────────────

class BookTranslationOut(BaseModel):
    language: str
    title: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────
# Book
# ─────────────────────────────────────────────

class BookBase(BaseModel):
    title: str
    language: str = Field(..., min_length=2, max_length=10)
    language_script: str | None = None
    title_romanized: str | None = None
    year_published: int | None = None
    description: str | None = None
    cover_url: str | None = None
    source: BookSource
    license: BookLicense
    formats: dict[str, Any] = Field(default_factory=dict)
    page_count: int | None = None
    word_count: int | None = None


class BookCreate(BookBase):
    pass


class BookOut(BookBase):
    id: uuid.UUID
    slug: str
    decade: int | None = None
    downloads: int
    is_approved: bool
    created_at: datetime
    updated_at: datetime
    authors: list[AuthorOut] = []
    genres: list[GenreOut] = []
    translations: list[BookTranslationOut] = []

    model_config = ConfigDict(from_attributes=True)


class BookListOut(BaseModel):
    """Lightweight listing payload (no translations/authors detail)."""
    id: uuid.UUID
    title: str
    slug: str
    language: str
    language_script: str | None = None
    title_romanized: str | None = None
    year_published: int | None = None
    decade: int | None = None
    cover_url: str | None = None
    source: BookSource
    license: BookLicense
    downloads: int
    authors: list[AuthorOut] = []
    genres: list[GenreOut] = []

    model_config = ConfigDict(from_attributes=True)


class PaginatedBooks(BaseModel):
    total: int
    page: int
    per_page: int
    items: list[BookListOut]


# ─────────────────────────────────────────────
# Submission
# ─────────────────────────────────────────────

class SubmissionCreate(BaseModel):
    title: str
    author_name: str
    author_email: EmailStr
    year: int | None = None
    language: str = Field(..., min_length=2, max_length=10)
    description: str | None = None
    license: BookLicense
    file_url: str | None = None


class SubmissionOut(BaseModel):
    id: uuid.UUID
    title: str
    author_name: str
    author_email: EmailStr
    year: int | None = None
    language: str
    description: str | None = None
    license: BookLicense
    file_url: str | None = None
    status: SubmissionStatus
    notes: str | None = None
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)
