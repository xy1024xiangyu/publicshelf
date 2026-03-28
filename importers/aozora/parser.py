"""Parse Aozora Bunko catalog CSV (Shift-JIS encoded)."""

from __future__ import annotations

import csv
import io
from typing import Any


# Aozora CSV columns (may vary by export date; these match the 2024 GitHub CSV)
TITLE_COL = "作品名"
AUTHOR_FAMILY_COL = "姓"
AUTHOR_GIVEN_COL = "名"
AUTHOR_FAMILY_RUBY_COL = "姓読み"
AUTHOR_GIVEN_RUBY_COL = "名読み"
BIRTH_YEAR_COL = "生年"
DEATH_YEAR_COL = "没年"
YEAR_COL = "初出"
XHTML_URL_COL = "XHTML/HTMLファイルURL"
TEXT_URL_COL = "テキストファイルURL"
BOOK_ID_COL = "作品ID"
COPYRIGHT_COL = "著作権フラグ"


def parse_catalog_csv(raw_bytes: bytes) -> list[dict[str, Any]]:
    """Parse Aozora Bunko catalog bytes (Shift-JIS) into a list of entry dicts.

    Only returns works where the copyright flag is '0' (public domain).
    """
    # Aozora encodes their CSV in Shift-JIS; decode with errors=replace
    text = raw_bytes.decode("shift_jis", errors="replace")
    reader = csv.DictReader(io.StringIO(text))

    entries: list[dict[str, Any]] = []
    for row in reader:
        # Copyright flag '0' means public domain / out of copyright in Japan
        if row.get(COPYRIGHT_COL, "1").strip() != "0":
            continue

        title: str = row.get(TITLE_COL, "").strip()
        book_id: str = row.get(BOOK_ID_COL, "").strip()
        if not title or not book_id:
            continue

        # Construct full name (Japanese order: family name first)
        family = row.get(AUTHOR_FAMILY_COL, "").strip()
        given = row.get(AUTHOR_GIVEN_COL, "").strip()
        name = f"{family}{given}".strip() or "Unknown"

        family_ruby = row.get(AUTHOR_FAMILY_RUBY_COL, "").strip()
        given_ruby = row.get(AUTHOR_GIVEN_RUBY_COL, "").strip()
        name_romanized = f"{family_ruby} {given_ruby}".strip() or None

        # Extract year from "初出" field (free-form, try to grab first 4-digit number)
        year_raw = row.get(YEAR_COL, "").strip()
        year: int | None = None
        if year_raw:
            import re
            m = re.search(r"\b(\d{4})\b", year_raw)
            if m:
                year = int(m.group(1))

        birth_raw = row.get(BIRTH_YEAR_COL, "").strip()
        death_raw = row.get(DEATH_YEAR_COL, "").strip()

        def _parse_year(s: str) -> int | None:
            import re
            m = re.search(r"\d{4}", s)
            return int(m.group()) if m else None

        entries.append({
            "aozora_id": book_id,
            "title": title,
            "language": "ja",
            "year_published": year,
            "author_name": name,
            "author_name_romanized": name_romanized,
            "author_birth_year": _parse_year(birth_raw),
            "author_death_year": _parse_year(death_raw),
            "txt_url": row.get(TEXT_URL_COL, "").strip(),
            "html_url": row.get(XHTML_URL_COL, "").strip(),
        })

    return entries
