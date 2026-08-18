from typing import Optional

from pydantic import BaseModel, Field, ValidationError


MAX_QUICK_REPLY_QUESTIONS = 5


class QuickReplyQuestion(BaseModel):
    question: str
    options: list[str] = Field(min_length=2, max_length=6)


def quick_replies_field():
    """The `quick_replies` field for a response schema: absent on a turn where the model didn't offer
    any, capped so a model that ignores the prompt's limit fails validation instead of flooding the UI."""
    return Field(default=None, max_length=MAX_QUICK_REPLY_QUESTIONS)


def parse_quick_replies(raw_data: dict) -> Optional[list[dict]]:
    """Re-validate `quick_replies` on its own out of a response that failed whole-schema validation.

    The original ValidationError may have been raised by `quick_replies` itself (e.g. too few
    options) rather than by the domain payload, so raw_data's copy can't be trusted as-is - but when
    it is valid, the questions are still worth showing rather than dropping the turn's only actionable
    content. Returns None if there are none or they don't validate.
    """
    try:
        parsed = [QuickReplyQuestion(**question).model_dump() for question in raw_data.get("quick_replies") or []]
    except (TypeError, ValidationError):
        return None
    return parsed or None
