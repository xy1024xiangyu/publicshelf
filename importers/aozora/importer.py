"""Aozora Bunko importer.

Fetches the Aozora catalog CSV (Shift-JIS) from their GitHub repository,
converts text to UTF-8, uploads to Azure Blob, and inserts into Postgres.
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
from aozora.parser import parse_catalog_csv

logger = logging.getLogger("importer.aozora")

# Aozora Bunko publishes their work list on GitHub as a CSV (Shift-JIS)
CATALOG_URL = (
    "https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/index_pages/list_person_all_extended_utf8.zip"
)
# Fallback: direct CSV (may be large)
CATALOG_URL_DIRECT = (
    "https://www.aozora.gr.jp/index_pages/list_person_all_extended_utf8.zip"
)

REQUEST_DELAY = 1.0  # seconds between downloads


class AozoraImporter(BaseImporter):
    name = "aozora"

    def __init__(self) -> None:
        super().__init__(languages=["ja"])
        self.connection_string: str = os.environ.get("AZURE_STORAGE_CONNECTION_STRING", "")
        self.container: str = os.environ.get("AZURE_STORAGE_CONTAINER", "openshelf-books")

    async def fetch_catalog(self) -> list[dict[str, Any]]:
        """Download Aozora catalog CSV (zipped UTF-8 version)."""
        logger.info("Fetching Aozora catalog…")
        catalog_bytes = await self._download_catalog()
        entries = parse_catalog_csv(catalog_bytes)
        logger.info("Parsed %d public-domain entries", len(entries))
        return entries

    async def _download_catalog(self) -> bytes:
        """Download the catalog ZIP and extract the CSV."""
        import io
        import zipfile

        for url in (CATALOG_URL, CATALOG_URL_DIRECT):
            try:
                async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    # The ZIP contains a single CSV file
                    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
                        csv_name = next(
                            (n for n in zf.namelist() if n.endswith(".csv")), None
                        )
                        if csv_name:
                            return zf.read(csv_name)
                        # If somehow no .csv, try the first file
                        return zf.read(zf.namelist()[0])
            except Exception as exc:
                logger.warning("Failed to fetch Aozora catalog from %s: %s", url, exc)

        raise RuntimeError("Could not fetch Aozora catalog from any URL.")

    async def process_entry(self, entry: dict[str, Any]) -> bool:
        title: str = entry["title"]
        aozora_id: str = entry["aozora_id"]

        slug = slugify(title, max_length=280)
        if not slug:
            slug = f"aozora-{aozora_id}"

        if await book_slug_exists(slug):
            logger.debug("Skipping already-imported: %s", slug)
            return False

        # Download text file (raw .txt, Shift-JIS)
        txt_url: str = entry.get("txt_url", "")
        txt_data: bytes | None = None
        blob_url: str = ""

        if txt_url:
            try:
                async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
                    resp = await client.get(txt_url)
                    if resp.status_code == 200:
                        txt_data = resp.content
            except Exception as exc:
                logger.warning("Failed to download text for %s: %s", slug, exc)
            await asyncio.sleep(REQUEST_DELAY)

        # Convert Shift-JIS → UTF-8 and upload
        if txt_data and self.connection_string:
            try:
                from app.utils.encoding import convert_to_utf8  # type: ignore[import]
                utf8_text = convert_to_utf8(txt_data, "shift_jis")
                utf8_bytes = utf8_text.encode("utf-8")
                blob_name = f"aozora/{aozora_id}.txt"
                blob_url = upload_bytes(
                    self.connection_string,
                    self.container,
                    blob_name,
                    utf8_bytes,
                    "text/plain; charset=utf-8",
                )
            except Exception as exc:
                logger.warning("Upload failed for %s: %s", slug, exc)

        formats: dict[str, str] = {}
        if blob_url:
            formats["txt"] = blob_url
        if entry.get("html_url"):
            formats["html"] = entry["html_url"]

        book_id = str(uuid.uuid4())

        async with get_session() as session:
            await session.execute(
                text("""
                    INSERT INTO books (
                        id, title, slug, language, year_published,
                        source, license, formats, is_approved
                    ) VALUES (
                        :id, :title, :slug, 'ja', :year,
                        'aozora', 'public_domain', :formats::jsonb, TRUE
                    )
                    ON CONFLICT (slug) DO NOTHING
                """),
                {
                    "id": book_id,
                    "title": title,
                    "slug": slug,
                    "year": entry.get("year_published"),
                    "formats": str(formats).replace("'", '"'),
                },
            )

            # Insert/link author
            author_name: str = entry.get("author_name", "")
            if author_name:
                author_id = str(uuid.uuid4())
                await session.execute(
                    text("""
                        INSERT INTO authors (id, name, name_romanized, birth_year, death_year)
                        VALUES (:id, :name, :romanized, :birth, :death)
                        ON CONFLICT DO NOTHING
                    """),
                    {
                        "id": author_id,
                        "name": author_name,
                        "romanized": entry.get("author_name_romanized"),
                        "birth": entry.get("author_birth_year"),
                        "death": entry.get("author_death_year"),
                    },
                )
                result = await session.execute(
                    text("SELECT id FROM authors WHERE name = :name LIMIT 1"),
                    {"name": author_name},
                )
                row = result.first()
                if row:
                    await session.execute(
                        text("""
                            INSERT INTO book_authors (book_id, author_id)
                            VALUES (:book_id, :author_id) ON CONFLICT DO NOTHING
                        """),
                        {"book_id": book_id, "author_id": str(row[0])},
                    )

        logger.info("Imported: %s (%s)", title, slug)
        return True
