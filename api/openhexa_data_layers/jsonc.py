import json

from typing import Any


def loads_jsonc(text: str) -> Any:
    """Parse JSON that may carry ``//`` / ``/* */`` comments and trailing commas.

    The OpenHexa configuration files are hand-maintained and use JS-style comments,
    which the stdlib ``json`` module rejects. This strips them - and any comma left
    dangling before ``}`` / ``]`` - in a single string-aware pass, then delegates to
    ``json.loads``.
    """
    return json.loads(_sanitize(text))


def _sanitize(text: str) -> str:
    out: list = []
    pending_comma = False
    in_string = False
    quote = ""
    i, length = 0, len(text)

    def flush_comma() -> None:
        nonlocal pending_comma
        if pending_comma:
            out.append(",")
            pending_comma = False

    while i < length:
        char = text[i]

        if in_string:
            out.append(char)
            if char == "\\" and i + 1 < length:
                out.append(text[i + 1])
                i += 2
                continue
            if char == quote:
                in_string = False
            i += 1
            continue

        if char in ('"', "'"):
            flush_comma()
            in_string, quote = True, char
            out.append(char)
        elif char == "/" and i + 1 < length and text[i + 1] == "/":
            i += 2
            while i < length and text[i] not in "\r\n":
                i += 1
            continue
        elif char == "/" and i + 1 < length and text[i + 1] == "*":
            i += 2
            while i + 1 < length and not (text[i] == "*" and text[i + 1] == "/"):
                i += 1
            i += 2
            continue
        elif char == ",":
            flush_comma()
            pending_comma = True
        elif char in "}]":
            pending_comma = False
            out.append(char)
        elif char.isspace():
            out.append(char)
        else:
            flush_comma()
            out.append(char)

        i += 1

    flush_comma()
    return "".join(out)
