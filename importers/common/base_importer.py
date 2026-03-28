"""Abstract base class for all importers."""

from __future__ import annotations

import abc
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ImportStats:
    imported: int = 0
    skipped: int = 0
    errors: int = 0
    messages: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "imported": self.imported,
            "skipped": self.skipped,
            "errors": self.errors,
            "messages": self.messages,
        }


class BaseImporter(abc.ABC):
    """Abstract base class that every importer must inherit from.

    Subclasses implement:
    - ``fetch_catalog()``   – return raw catalog entries (list of dicts)
    - ``process_entry()``   – turn one catalog entry into a DB record
    """

    name: str = "base"

    def __init__(self, languages: list[str] | None = None) -> None:
        self.languages = set(languages or ["en"])
        self.stats = ImportStats()
        self.logger = logging.getLogger(f"importer.{self.name}")

    @abc.abstractmethod
    async def fetch_catalog(self) -> list[dict[str, Any]]:
        """Download/parse the source catalog and return a list of raw entries."""
        ...

    @abc.abstractmethod
    async def process_entry(self, entry: dict[str, Any]) -> bool:
        """Process one catalog entry.

        Returns True if the entry was imported, False if skipped.
        Raise an exception to signal an error (it will be caught by ``run``).
        """
        ...

    async def run(self, limit: int = 0) -> dict[str, Any]:
        """Execute the full import pipeline.

        Args:
            limit: If > 0, stop after importing *limit* entries.
        """
        self.logger.info("%s importer starting (languages=%s, limit=%d)", self.name, self.languages, limit)
        catalog = await self.fetch_catalog()
        self.logger.info("Catalog loaded: %d entries", len(catalog))

        for i, entry in enumerate(catalog):
            if limit and i >= limit:
                break
            try:
                imported = await self.process_entry(entry)
                if imported:
                    self.stats.imported += 1
                else:
                    self.stats.skipped += 1
            except Exception as exc:
                self.stats.errors += 1
                self.logger.warning("Error processing entry %d: %s", i, exc)

        self.logger.info("Import complete: %s", self.stats.to_dict())
        return self.stats.to_dict()
