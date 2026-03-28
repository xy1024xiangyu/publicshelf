"""Azure Blob Storage helpers: upload, download, and signed URL generation."""

from __future__ import annotations

import datetime
import io
import mimetypes
from pathlib import PurePosixPath

from azure.storage.blob import (
    BlobSasPermissions,
    BlobServiceClient,
    ContentSettings,
    generate_blob_sas,
)

from app.config import settings


def _client() -> BlobServiceClient:
    return BlobServiceClient.from_connection_string(
        settings.AZURE_STORAGE_CONNECTION_STRING
    )


def _container_client():
    return _client().get_container_client(settings.AZURE_STORAGE_CONTAINER)


async def upload_bytes(
    blob_name: str,
    data: bytes,
    content_type: str | None = None,
) -> str:
    """Upload *data* to Azure Blob Storage and return the blob URL.

    The container must already exist.  Returns the blob's public (or SAS) URL.
    """
    if content_type is None:
        guessed, _ = mimetypes.guess_type(blob_name)
        content_type = guessed or "application/octet-stream"

    container = _container_client()
    blob_client = container.get_blob_client(blob_name)
    blob_client.upload_blob(
        io.BytesIO(data),
        overwrite=True,
        content_settings=ContentSettings(content_type=content_type),
    )
    return blob_client.url


async def upload_file(local_path: str, blob_name: str | None = None) -> str:
    """Upload a local file to Azure Blob Storage.

    If *blob_name* is None the filename portion of *local_path* is used.
    """
    path = PurePosixPath(local_path)
    target_name = blob_name or path.name
    with open(local_path, "rb") as fh:
        data = fh.read()
    return await upload_bytes(target_name, data)


def generate_signed_url(blob_name: str, expiry_hours: int = 1) -> str:
    """Generate a short-lived SAS URL for reading a private blob.

    Useful for secure "download" redirects.
    """
    client = _client()
    account_name: str = client.account_name  # type: ignore[attr-defined]
    account_key: str | None = client.credential.account_key  # type: ignore[attr-defined]

    if not account_key:
        raise RuntimeError(
            "Cannot generate SAS token: storage account key is not available "
            "(managed-identity connections don't expose the key)."
        )

    sas_token = generate_blob_sas(
        account_name=account_name,
        container_name=settings.AZURE_STORAGE_CONTAINER,
        blob_name=blob_name,
        account_key=account_key,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.datetime.utcnow() + datetime.timedelta(hours=expiry_hours),
    )
    return (
        f"https://{account_name}.blob.core.windows.net"
        f"/{settings.AZURE_STORAGE_CONTAINER}/{blob_name}?{sas_token}"
    )


async def delete_blob(blob_name: str) -> None:
    """Remove a blob from the container (soft-delete if enabled on the account)."""
    container = _container_client()
    container.delete_blob(blob_name, delete_snapshots="include")
