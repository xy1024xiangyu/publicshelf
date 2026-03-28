"""Author ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Author(Base):
    __tablename__ = "authors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    name_romanized: Mapped[str | None] = mapped_column(Text)
    birth_year: Mapped[int | None] = mapped_column(SmallInteger)
    death_year: Mapped[int | None] = mapped_column(SmallInteger)
    bio: Mapped[str | None] = mapped_column(Text)
    nationality: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship (back-populated by BookAuthor association)
    books: Mapped[list] = relationship(
        "Book", secondary="book_authors", back_populates="authors", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Author id={self.id} name={self.name!r}>"
