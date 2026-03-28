"""Thin wrapper around azure-storage-blob for importers."""

from __future__ import annotations

import io
import mimetypes

from azure.storage.blob import BlobServiceClient, ContentSettings


def get_client(connection_string: str) -> BlobServiceClient:
    return BlobServiceClient.from_connection_string(connection_string)


def upload_bytes(
    connection_string: str,
    container: str,
    blob_name: str,
    data: bytes,
    content_type: str | None = None,
) -> str:
    """Upload *data* and return the blob URL."""
    if content_type is None:
        guessed, _ = mimetypes.guess_type(blob_name)
        content_type = guessed or "application/octet-stream"

    client = get_client(connection_string)
    blob_client = client.get_blob_client(container=container, blob=blob_name)
    blob_client.upload_blob(
        io.BytesIO(data),
        overwrite=True,
        content_settings=ContentSettings(content_type=content_type),
    )
    return blob_client.url
