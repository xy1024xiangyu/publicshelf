"""Import coordination service.

Provides a high-level entry point that can be called from the API
(e.g., admin trigger) or by the standalone importer scripts.
"""

from __future__ import annotations

import logging
from typing import Literal

logger = logging.getLogger(__name__)

ImporterSource = Literal["gutenberg", "aozora"]


async def trigger_import(
    source: ImporterSource,
    languages: list[str] | None = None,
    limit: int = 100,
) -> dict[str, int]:
    """Trigger an importer run for the given *source*.

    This is intentionally lightweight: the heavy logic lives in the
    ``importers/`` package and is designed to run as a standalone process
    or cron job.  This service can be wired to an admin endpoint or a
    background task runner.

    Returns a dict with ``{"imported": N, "skipped": M, "errors": K}``.
    """
    logger.info("Starting import: source=%s languages=%s limit=%d", source, languages, limit)

    if source == "gutenberg":
        from importers.gutenberg.importer import GutenbergImporter  # type: ignore[import]
        importer = GutenbergImporter(languages=languages or ["en", "de", "fr", "zh", "ja"])
    elif source == "aozora":
        from importers.aozora.importer import AozoraImporter  # type: ignore[import]
        importer = AozoraImporter()
    else:
        raise ValueError(f"Unknown source: {source!r}")

    stats = await importer.run(limit=limit)
    logger.info("Import finished: %s", stats)
    return stats
