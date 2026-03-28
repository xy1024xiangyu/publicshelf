"""Basic tests for the OpenShelf FastAPI application."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.mark.asyncio
async def test_health_check():
    """GET /health should return 200 with status ok."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_get_books_empty():
    """GET /books should return 200 with paginated empty list when DB is empty."""
    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = []
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.scalar = AsyncMock(return_value=0)

    async def override_get_db():
        yield mock_session

    from app.database import get_db
    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/books")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_stats():
    """GET /stats should return 200 with expected keys."""
    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = []
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.scalar = AsyncMock(return_value=0)

    async def override_get_db():
        yield mock_session

    from app.database import get_db
    app.dependency_overrides[get_db] = override_get_db

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_books" in data
    finally:
        app.dependency_overrides.clear()


def test_placeholder_always_passes():
    """Placeholder test to confirm pytest is collecting correctly."""
    assert True
