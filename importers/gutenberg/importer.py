"""Project Gutenberg importer.

Fetches the Gutenberg catalog CSV, filters by language, downloads EPUBs,
uploads them to Azure Blob Storage, and inserts records into Postgres.

Rate-limited to 1 request/second to respect Gutenberg's servers.
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from typing import Any

import httpx
from slugify import slugify
from sqlalchemy import text

from common.base_importer import BaseImporter
from common.db import book_slug_exists, get_session
from common.storage import upload_bytes
from gutenberg.parser import parse_catalog_csv

logger = logging.getLogger("importer.gutenberg")

CATALOG_URL = "https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv"
REQUEST_DELAY = 1.0  # seconds between HTTP requests (respect Gutenberg ToS)


class GutenbergImporter(BaseImporter):
    name = "gutenberg"

    def __init__(self, languages: list[str] | None = None) -> None:
        super().__init__(languages=languages or ["en", "de", "fr", "zh", "ja"])
        self.connection_string: str = os.environ.get("AZURE_STORAGE_CONNECTION_STRING", "")
        self.container: str = os.environ.get("AZURE_STORAGE_CONTAINER", "openshelf-books")

    async def fetch_catalog(self) -> list[dict[str, Any]]:
        logger.info("Fetching Gutenberg catalog from %s", CATALOG_URL)
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            resp = await client.get(CATALOG_URL)
            resp.raise_for_status()
            raw_csv = resp.text

        entries = parse_catalog_csv(raw_csv, self.languages)
        logger.info("Parsed %d entries matching languages %s", len(entries), self.languages)
        return entries

    async def process_entry(self, entry: dict[str, Any]) -> bool:
        title: str = entry["title"]
        lang: str = entry["language"]
        year: int | None = entry.get("year_published")
        pg_id: str = entry["gutenberg_id"]

        slug = slugify(title, max_length=280)
        if not slug:
            slug = f"gutenberg-{pg_id}"

        # Skip duplicates
        if await book_slug_exists(slug):
            logger.debug("Skipping already-imported slug: %s", slug)
            return False

        # Download the EPUB (rate limited)
        epub_url_remote = entry["epub_url"]
        epub_data: bytes | None = None
        blob_url: str = ""

        try:
            async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
                resp = await client.get(epub_url_remote)
                if resp.status_code == 200:
                    epub_data = resp.content
        except Exception as exc:
            logger.warning("Failed to download EPUB for %s: %s", slug, exc)

        await asyncio.sleep(REQUEST_DELAY)  # respect rate limit

        # Upload to Azure Blob
        if epub_data and self.connection_string:
            blob_name = f"gutenberg/{pg_id}.epub"
            try:
                blob_url = upload_bytes(
                    self.connection_string,
                    self.container,
                    blob_name,
                    epub_data,
                    "application/epub+zip",
                )
            except Exception as exc:
                logger.warning("Azure upload failed for %s: %s", slug, exc)

        formats: dict[str, str] = {}
        if blob_url:
            formats["epub"] = blob_url
        # Always include Gutenberg TXT URL as a fallback
        formats["txt"] = entry["txt_url"]

        # Upsert book into Postgres
        book_id = str(uuid.uuid4())
        import json
        async with get_session() as session:
            await session.execute(
                text("""
                    INSERT INTO books (
                        id, title, slug, language, year_published,
                        source, license, formats, is_approved
                    ) VALUES (
                        :id, :title, :slug, :language, :year,
                        'gutenberg', 'public_domain', cast(:formats as jsonb), TRUE
                    )
                    ON CONFLICT (slug) DO NOTHING
                """),
                {
                    "id": book_id,
                    "title": title,
                    "slug": slug,
                    "language": lang,
                    "year": year,
                    "formats": json.dumps(formats),
                },
            )

            # Insert authors
            for author_data in entry.get("authors", []):
                author_name: str = author_data.get("name", "")
                if not author_name:
                    continue
                author_id = str(uuid.uuid4())
                await session.execute(
                    text("""
                        INSERT INTO authors (id, name, birth_year, death_year)
                        VALUES (:id, :name, :birth, :death)
                        ON CONFLICT DO NOTHING
                    """),
                    {
                        "id": author_id,
                        "name": author_name,
                        "birth": author_data.get("birth_year"),
                        "death": author_data.get("death_year"),
                    },
                )
                # Link via name lookup (handles ON CONFLICT DO NOTHING above)
                result = await session.execute(
                    text("SELECT id FROM authors WHERE name = :name LIMIT 1"),
                    {"name": author_name},
                )
                row = result.first()
                if row:
                    await session.execute(
                        text("""
                            INSERT INTO book_authors (book_id, author_id)
                            VALUES (:book_id, :author_id)
                            ON CONFLICT DO NOTHING
                        """),
                        {"book_id": book_id, "author_id": str(row[0])},
                    )

        logger.info("Imported: %s (%s, %s)", title, lang, slug)
        return True
