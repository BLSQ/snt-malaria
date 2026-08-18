from typing import Optional

from .anthropic_files import build_document_blocks


def build_message(role: str, content: str, attachments: Optional[list[dict]] = None) -> dict:
    """Build a single Anthropic message as content blocks."""
    blocks = build_document_blocks(attachments)
    blocks.append({"type": "text", "text": content})
    return {"role": role, "content": blocks}


def build_conversation(message: str, conversation_history: list[dict], attachments: Optional[list[dict]] = None):
    """The full message list for a turn: the prior history (each entry keeping its own attachments,
    so a document stays referenced on every later turn) plus the new user message."""
    messages = [
        build_message(entry["role"], entry["content"], entry.get("attachments")) for entry in conversation_history
    ]
    messages.append(build_message("user", message, attachments))
    return messages


def append_turn(
    conversation_history: list[dict], message: str, response_text: str, attachments: Optional[list[dict]] = None
) -> list[dict]:
    """History with this turn's user message and raw assistant reply appended."""
    user_entry = {"role": "user", "content": message}
    if attachments:
        # So a later turn's resent history still references the same uploaded file.
        user_entry["attachments"] = attachments
    return list(conversation_history) + [user_entry, {"role": "assistant", "content": response_text}]


def extract_json_text(response_text: str) -> str:
    """Extract the JSON object substring from Claude's response: strips a markdown code fence if
    present, otherwise falls back to the outermost {...} span if the model added conversational text
    around the JSON with no fence (e.g. "You're right - ..." before it, or a remark after it),
    despite being told not to add text outside the JSON."""
    text = response_text.strip()

    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    elif "{" in text and "}" in text:
        text = text[text.index("{") : text.rindex("}") + 1]

    return text
