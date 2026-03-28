"""Slug generation utilities."""

from __future__ import annotations

from slugify import slugify as _slugify


def generate_slug(text: str, max_length: int = 280) -> str:
    """Generate a URL-safe slug from any Unicode text.

    Examples
    --------
    >>> generate_slug("吾輩は猫である")
    'wu-bei-hamao-dearu'   # pinyin/romanised fallback via python-slugify
    >>> generate_slug("Les Misérables")
    'les-miserables'
    """
    return _slugify(
        text,
        max_length=max_length,
        word_boundary=True,
        separator="-",
        lowercase=True,
        allow_unicode=False,  # Force ASCII-safe output
    )


def unique_slug(base_text: str, existing_slugs: set[str]) -> str:
    """Ensure the generated slug is unique within *existing_slugs*.

    Appends a numeric suffix (-2, -3, …) when a collision is found.
    """
    base = generate_slug(base_text)
    if base not in existing_slugs:
        return base

    counter = 2
    while True:
        candidate = f"{base}-{counter}"
        if candidate not in existing_slugs:
            return candidate
        counter += 1
