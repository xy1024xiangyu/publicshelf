"""Search service: Azure AI Search with Postgres FTS fallback."""

from __future__ import annotations

import logging
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

logger = logging.getLogger(__name__)

# Mapping of ISO 639-1 code → Azure AI Search analyzer name
LANGUAGE_ANALYZERS: dict[str, str] = {
    "en": "en.microsoft",
    "de": "de.microsoft",
    "fr": "fr.microsoft",
    "ja": "ja.microsoft",
    "zh": "zh-Hans.microsoft",
    "es": "es.microsoft",
    "it": "it.microsoft",
    "pt": "pt-PT.microsoft",
    "ru": "ru.microsoft",
    "ko": "ko.microsoft",
}

# Corresponding Postgres text-search config per language
PG_FTS_CONFIG: dict[str, str] = {
    "en": "english",
    "de": "german",
    "fr": "french",
    "es": "spanish",
    "it": "italian",
    "pt": "portuguese",
    "ru": "russian",
}


async def search_azure(
    query: str,
    *,
    language: str | None = None,
    decade: int | None = None,
    genre_slug: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict[str, Any]:
    """Execute a search against Azure AI Search.

    Returns a dict with keys: total, items (list of raw hit dicts), source="azure".
    Raises an exception on failure so the caller can fall back to Postgres FTS.
    """
    index = f"{settings.AZURE_SEARCH_INDEX_PREFIX}-books"
    url = f"{settings.AZURE_SEARCH_ENDPOINT}/indexes/{index}/docs/search?api-version=2023-11-01"

    filters: list[str] = ["is_approved eq true"]
    if language:
        filters.append(f"language eq '{language}'")
    if decade is not None:
        filters.append(f"decade eq {decade}")

    body: dict[str, Any] = {
        "search": query,
        "top": per_page,
        "skip": (page - 1) * per_page,
        "count": True,
        "filter": " and ".join(filters),
        "select": "id,title,slug,language,year_published,decade,cover_url,source,license,downloads",
        "queryType": "simple",
    }

    # Apply language-specific analyzer when language is known
    if language and language in LANGUAGE_ANALYZERS:
        body["searchFields"] = f"title,description,title_romanized"
        # Azure Search supports per-field analyzers; here we hint via queryLanguage
        body["queryLanguage"] = language

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            url,
            json=body,
            headers={"api-key": settings.AZURE_SEARCH_KEY, "Content-Type": "application/json"},
        )
        resp.raise_for_status()

    data = resp.json()
    return {
        "total": data.get("@odata.count", 0),
        "items": data.get("value", []),
        "source": "azure",
    }


async def search_postgres(
    db: AsyncSession,
    query: str,
    *,
    language: str | None = None,
    decade: int | None = None,
    genre_slug: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict[str, Any]:
    """Fallback full-text search using Postgres tsvector.

    Automatically selects the correct text-search configuration based on *language*.
    """
    fts_config = PG_FTS_CONFIG.get(language or "", "simple")
    offset = (page - 1) * per_page

    # Build the query dynamically; parameters are passed safely via SQLAlchemy
    conditions = ["b.is_approved = TRUE"]
    params: dict[str, Any] = {
        "query": query,
        "per_page": per_page,
        "offset": offset,
        "fts_config": fts_config,
    }

    if language:
        conditions.append("b.language = :language")
        params["language"] = language
    if decade is not None:
        conditions.append("b.decade = :decade")
        params["decade"] = decade

    where_clause = " AND ".join(conditions)

    if genre_slug:
        join_genre = (
            "JOIN book_genres bg ON bg.book_id = b.id "
            "JOIN genres g ON g.id = bg.genre_id AND g.slug = :genre_slug"
        )
        params["genre_slug"] = genre_slug
    else:
        join_genre = ""

    sql = text(f"""
        SELECT
            b.id, b.title, b.slug, b.language, b.language_script,
            b.title_romanized, b.year_published, b.decade,
            b.cover_url, b.source, b.license, b.downloads,
            ts_rank(
                to_tsvector(:fts_config, coalesce(b.title,'') || ' ' || coalesce(b.description,'')),
                websearch_to_tsquery(:fts_config, :query)
            ) AS rank,
            COUNT(*) OVER() AS total_count
        FROM books b
        {join_genre}
        WHERE {where_clause}
          AND to_tsvector(:fts_config, coalesce(b.title,'') || ' ' || coalesce(b.description,''))
              @@ websearch_to_tsquery(:fts_config, :query)
        ORDER BY rank DESC
        LIMIT :per_page OFFSET :offset
    """)

    result = await db.execute(sql, params)
    rows = result.mappings().all()

    total = int(rows[0]["total_count"]) if rows else 0
    items = [dict(row) for row in rows]
    for item in items:
        item.pop("rank", None)
        item.pop("total_count", None)
        # Convert UUID to str for consistency with Azure response
        item["id"] = str(item["id"])

    return {"total": total, "items": items, "source": "postgres"}


async def search(
    db: AsyncSession,
    query: str,
    *,
    language: str | None = None,
    decade: int | None = None,
    genre_slug: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict[str, Any]:
    """High-level search: try Azure AI Search, fall back to Postgres FTS."""
    if settings.azure_search_available:
        try:
            return await search_azure(
                query,
                language=language,
                decade=decade,
                genre_slug=genre_slug,
                page=page,
                per_page=per_page,
            )
        except Exception as exc:
            logger.warning("Azure search failed (%s), falling back to Postgres FTS.", exc)

    return await search_postgres(
        db,
        query,
        language=language,
        decade=decade,
        genre_slug=genre_slug,
        page=page,
        per_page=per_page,
    )
