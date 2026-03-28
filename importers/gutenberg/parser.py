"""Parse Project Gutenberg catalog CSV rows."""

from __future__ import annotations

import csv
import io
from typing import Any


GUTENBERG_LANGUAGES = {
    "en": "English",
    "de": "German",
    "fr": "French",
    "zh": "Chinese",
    "ja": "Japanese",
    "es": "Spanish",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "ru": "Russian",
    "fi": "Finnish",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "pl": "Polish",
}


def parse_catalog_csv(raw_csv: str, target_languages: set[str]) -> list[dict[str, Any]]:
    """Parse the Gutenberg pg_catalog.csv and return a filtered list of entries.

    Only returns public-domain books in *target_languages* that have at least
    an EPUB format available.
    """
    reader = csv.DictReader(io.StringIO(raw_csv))
    entries: list[dict[str, Any]] = []

    for row in reader:
        lang = row.get("Language", "").strip().lower()
        # Gutenberg uses 2-letter ISO 639-1 codes (mostly)
        if lang not in target_languages:
            continue

        # Skip rows without an EPUB
        subjects = row.get("Subjects", "")
        title = row.get("Title", "").strip()
        pg_id = row.get("Text#", "").strip()

        if not pg_id or not title:
            continue

        # Build a download URL pattern (Gutenberg canonical URL)
        epub_url = f"https://www.gutenberg.org/ebooks/{pg_id}.epub.noimages"
        txt_url = f"https://www.gutenberg.org/files/{pg_id}/{pg_id}-0.txt"

        # Parse year from "Issued" field (format: YYYY-MM-DD)
        issued = row.get("Issued", "").strip()
        year: int | None = None
        if issued and len(issued) >= 4:
            try:
                year = int(issued[:4])
            except ValueError:
                pass

        # Parse authors: Gutenberg lists "Last, First" or "Last, First, YYYY-YYYY"
        author_raw = row.get("Authors", "").strip()
        authors = _parse_authors(author_raw)

        entries.append({
            "gutenberg_id": pg_id,
            "title": title,
            "language": lang,
            "year_published": year,
            "authors": authors,
            "subjects": [s.strip() for s in subjects.split(";") if s.strip()],
            "epub_url": epub_url,
            "txt_url": txt_url,
        })

    return entries


def _parse_authors(raw: str) -> list[dict[str, str]]:
    """Turn a Gutenberg author string into a list of {name, birth_year, death_year}."""
    if not raw:
        return []
    parts = [p.strip() for p in raw.split(";")]
    result = []
    for part in parts:
        if not part:
            continue
        # Pattern: "Dickens, Charles, 1812-1870"
        segments = [s.strip() for s in part.split(",")]
        if len(segments) >= 2:
            name = f"{segments[1]} {segments[0]}".strip()
        else:
            name = segments[0]

        birth: int | None = None
        death: int | None = None
        if len(segments) >= 3:
            years = segments[2].strip()
            if "-" in years:
                yparts = years.split("-")
                try:
                    birth = int(yparts[0]) if yparts[0] else None
                except ValueError:
                    pass
                try:
                    death = int(yparts[1]) if len(yparts) > 1 and yparts[1] else None
                except ValueError:
                    pass

        result.append({"name": name, "birth_year": birth, "death_year": death})
    return result
