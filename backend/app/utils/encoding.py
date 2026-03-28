"""Encoding detection and conversion utilities."""

from __future__ import annotations

import chardet


def detect_encoding(data: bytes, fallback: str = "utf-8") -> str:
    """Detect the character encoding of a byte string.

    Uses chardet for detection; falls back to *fallback* when confidence
    is too low or detection fails.
    """
    result = chardet.detect(data)
    encoding: str | None = result.get("encoding")
    confidence: float = result.get("confidence") or 0.0

    if encoding and confidence >= 0.7:
        return encoding.lower()
    return fallback


def convert_to_utf8(data: bytes, source_encoding: str | None = None) -> str:
    """Convert bytes to a UTF-8 string.

    If *source_encoding* is None the encoding is auto-detected.
    Replacement characters are used for bytes that cannot be decoded.
    """
    if source_encoding is None:
        source_encoding = detect_encoding(data)

    try:
        return data.decode(source_encoding, errors="replace")
    except (LookupError, UnicodeDecodeError):
        # Last resort: try UTF-8 with replacement
        return data.decode("utf-8", errors="replace")
