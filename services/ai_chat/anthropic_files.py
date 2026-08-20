import logging

from typing import Optional

import anthropic


logger = logging.getLogger(__name__)

# Required whenever a request references an uploaded file by id, whether to manage the file itself
# or to send a `document` content block pointing at it.
ANTHROPIC_FILES_BETA = "files-api-2025-04-14"


def upload_file(api_key: str, uploaded_file, content_type: str) -> dict:
    """Proxy an uploaded file to the Anthropic Files API, never storing it locally.

    Returns `{file_id, filename, size_bytes}`. Raises `anthropic.APIError` - the caller decides how
    to turn that into a response.
    """
    client = anthropic.Anthropic(api_key=api_key)
    uploaded = client.beta.files.upload(
        file=(uploaded_file.name, uploaded_file, content_type),
        betas=[ANTHROPIC_FILES_BETA],
    )
    return {"file_id": uploaded.id, "filename": uploaded_file.name, "size_bytes": uploaded.size_bytes}


def delete_file(api_key: str, file_id: str) -> None:
    """Best-effort deletion of a previously uploaded file: a failure here only leaves a file behind
    on Anthropic's side, which the user can neither see nor act on, so it's logged and swallowed."""
    try:
        anthropic.Anthropic(api_key=api_key).beta.files.delete(file_id, betas=[ANTHROPIC_FILES_BETA])
    except anthropic.APIError:
        logger.warning("Failed to delete AI chat attachment %s", file_id)


def build_document_blocks(attachments: Optional[list[dict]] = None) -> list[dict]:
    """Anthropic content blocks referencing already-uploaded files, to prepend to a message's text."""
    return [
        {
            "type": "document",
            "source": {"type": "file", "file_id": attachment["file_id"]},
            "title": attachment.get("filename"),
            # Every later turn resends the full history, including this same block - caching it
            # avoids Claude reprocessing the document on every turn after the one that attached it.
            "cache_control": {"type": "ephemeral"},
        }
        for attachment in attachments or []
    ]
