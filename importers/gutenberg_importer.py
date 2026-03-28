#!/usr/bin/env python3
"""Gutenberg importer CLI entry point."""

import asyncio
import argparse
import logging
import sys

from gutenberg.importer import GutenbergImporter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("gutenberg_importer")


async def main():
    parser = argparse.ArgumentParser(
        description="Import books from Project Gutenberg into the PublicShelf database."
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Maximum number of books to import (default: 100)",
    )
    parser.add_argument(
        "--language",
        type=str,
        default="en,de,fr,zh,ja",
        help="Comma-separated language codes to import (default: en,de,fr,zh,ja)",
    )

    args = parser.parse_args()

    # Parse languages
    languages = [lang.strip() for lang in args.language.split(",")]

    logger.info("Starting Gutenberg import with limit=%d, languages=%s", args.limit, languages)

    importer = GutenbergImporter(languages=languages)
    await importer.run(limit=args.limit)

    logger.info("Gutenberg import completed successfully!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error("Import failed: %s", str(e), exc_info=True)
        sys.exit(1)
