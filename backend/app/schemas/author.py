"""Pydantic schemas for Author."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class AuthorBase(BaseModel):
    name: str
    name_romanized: str | None = None
    birth_year: int | None = None
    death_year: int | None = None
    bio: str | None = None
    nationality: str | None = None


class AuthorCreate(AuthorBase):
    pass


class AuthorOut(AuthorBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
