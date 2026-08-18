import logging

import anthropic

from rest_framework import status


SERVICE_UNAVAILABLE_ERROR = "The AI service is temporarily unavailable. Please try again later."
REQUEST_REJECTED_ERROR = "The AI service rejected this request. Please contact your administrator."


def classify_anthropic_error(exc: Exception, *, generic_message: str, logger: logging.Logger):
    """Map a failed Claude call to an (http status, response body) pair.

    Call from inside an `except` block - the fall-through case logs a traceback. `logger` belongs to
    the calling view so the record attributes to that feature.
    """
    if isinstance(exc, anthropic.APIStatusError):
        if exc.status_code == 503:
            logger.warning("Claude API returned 503")
            return status.HTTP_503_SERVICE_UNAVAILABLE, {"error": SERVICE_UNAVAILABLE_ERROR}
        if exc.status_code == 400:
            # A persistent configuration problem (e.g. an invalid/out-of-credit API key) rather than
            # a transient failure - "try again" would be misleading. The account's Anthropic key is
            # an admin-level config the end user has no visibility or control over, so log
            # Anthropic's own detail for an admin to diagnose, but never show it to the user.
            logger.error("Claude API rejected the request: %s", exc)
            return status.HTTP_400_BAD_REQUEST, {"error": REQUEST_REJECTED_ERROR}

    logger.exception("AI chat request failed")
    return status.HTTP_400_BAD_REQUEST, {"error": generic_message}
