"""Genre ORM model."""

from __future__ import annotations

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Genre(Base):
    __tablename__ = "genres"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")

    books: Mapped[list] = relationship(
        "Book", secondary="book_genres", back_populates="genres", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Genre id={self.id} slug={self.slug!r}>"
