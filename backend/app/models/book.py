"""Book ORM models including association tables and BookTranslation."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# ─────────────────────────────────────────────
# Association tables (no ORM class needed)
# ─────────────────────────────────────────────

book_authors_table = Table(
    "book_authors",
    Base.metadata,
    Column("book_id", UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
    Column("author_id", UUID(as_uuid=True), ForeignKey("authors.id", ondelete="CASCADE"), primary_key=True),
)

book_genres_table = Table(
    "book_genres",
    Base.metadata,
    Column("book_id", UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
    Column("genre_id", Integer, ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
)


# ─────────────────────────────────────────────
# Book
# ─────────────────────────────────────────────

class Book(Base):
    __tablename__ = "books"
    __table_args__ = (
        # composite FTS index hint (actual indexes created in schema.sql)
        Index("idx_books_language", "language"),
        Index("idx_books_year_published", "year_published"),
        Index("idx_books_source", "source"),
        Index("idx_books_license", "license"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(String(300), nullable=False, unique=True, index=True)
    language: Mapped[str] = mapped_column(String(10), nullable=False)
    language_script: Mapped[str | None] = mapped_column(String(20))
    title_romanized: Mapped[str | None] = mapped_column(Text)
    year_published: Mapped[int | None] = mapped_column(SmallInteger)
    # decade is a GENERATED ALWAYS column in PG; we expose it as server_default-style
    # SQLAlchemy reads it but never writes it.
    decade: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    description: Mapped[str | None] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(
        Enum("gutenberg", "aozora", "archive", "author_submitted", name="book_source"),
        nullable=False,
    )
    license: Mapped[str] = mapped_column(
        Enum("public_domain", "cc0", "cc_by", "cc_by_sa", name="book_license"),
        nullable=False,
    )
    # e.g. {"epub": "https://...", "txt": "https://..."}
    formats: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    page_count: Mapped[int | None] = mapped_column(Integer)
    word_count: Mapped[int | None] = mapped_column(Integer)
    downloads: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    authors: Mapped[list] = relationship(
        "Author", secondary=book_authors_table, back_populates="books", lazy="selectin"
    )
    genres: Mapped[list] = relationship(
        "Genre", secondary=book_genres_table, back_populates="books", lazy="selectin"
    )
    translations: Mapped[list["BookTranslation"]] = relationship(
        back_populates="book", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Book id={self.id} slug={self.slug!r}>"


# ─────────────────────────────────────────────
# BookTranslation
# ─────────────────────────────────────────────

class BookTranslation(Base):
    __tablename__ = "book_translations"

    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"), primary_key=True
    )
    language: Mapped[str] = mapped_column(String(10), primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    book: Mapped["Book"] = relationship(back_populates="translations")

    def __repr__(self) -> str:
        return f"<BookTranslation book_id={self.book_id} lang={self.language!r}>"


# ─────────────────────────────────────────────
# Submission
# ─────────────────────────────────────────────

class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    author_name: Mapped[str] = mapped_column(Text, nullable=False)
    author_email: Mapped[str] = mapped_column(Text, nullable=False)
    year: Mapped[int | None] = mapped_column(SmallInteger)
    language: Mapped[str] = mapped_column(String(10), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    license: Mapped[str] = mapped_column(
        Enum("public_domain", "cc0", "cc_by", "cc_by_sa", name="book_license"),
        nullable=False,
    )
    file_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        Enum("pending", "approved", "rejected", name="submission_status"),
        nullable=False,
        default="pending",
    )
    notes: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Submission id={self.id} title={self.title!r} status={self.status!r}>"
