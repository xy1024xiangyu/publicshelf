"""Submissions router – public book submission."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.book import Submission
from app.schemas.book import SubmissionCreate, SubmissionOut

router = APIRouter(prefix="/submissions", tags=["submissions"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.post("", response_model=SubmissionOut, status_code=201, summary="Submit a book for review")
async def create_submission(payload: SubmissionCreate, db: DB) -> SubmissionOut:
    submission = Submission(
        title=payload.title,
        author_name=payload.author_name,
        author_email=payload.author_email,
        year=payload.year,
        language=payload.language,
        description=payload.description,
        license=payload.license,
        file_url=payload.file_url,
        status="pending",
    )
    db.add(submission)
    await db.flush()  # Populate the generated id before commit
    await db.refresh(submission)
    return SubmissionOut.model_validate(submission)


@router.get("/{submission_id}", response_model=SubmissionOut, summary="Check submission status")
async def get_submission(
    submission_id: Annotated[uuid.UUID, Path()],
    db: DB,
) -> SubmissionOut:
    stmt = select(Submission).where(Submission.id == submission_id)
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return SubmissionOut.model_validate(sub)
