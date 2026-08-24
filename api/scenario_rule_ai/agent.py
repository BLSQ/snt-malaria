import json
import logging

from typing import Optional

import anthropic

from django.conf import settings
from pydantic import BaseModel, Field, ValidationError

from iaso.utils.colors import COLOR_CHOICES
from plugins.snt_malaria.services.ai_chat import (
    ANTHROPIC_FILES_BETA,
    QuickReplyQuestion,
    append_turn,
    build_conversation,
    extract_json_text,
    parse_quick_replies,
    quick_replies_field,
)


logger = logging.getLogger(__name__)

# Shown instead of any raw model output whenever a rules attempt couldn't be turned into a valid
# rule set, whether it failed to parse as JSON at all or parsed but didn't match the schema.
RULES_PARSE_FAILURE_MESSAGE = (
    "I couldn't put together a valid set of rules for that - could you try rephrasing your request?"
)


# Substituted into the prompt template per request with the account's catalogs. The template is
# applied with str.replace (not str.format), so literal braces in the prompt (e.g. the JSON schema
# example) need no escaping.
METRIC_TYPES_CATALOG_PLACEHOLDER = "{metric_types_catalog}"
INTERVENTIONS_CATALOG_PLACEHOLDER = "{interventions_catalog}"
COLORS_CATALOG_PLACEHOLDER = "{colors_catalog}"

SCENARIO_RULE_SYSTEM_PROMPT_TEMPLATE = """You are an expert at building malaria intervention scenario rules.

A scenario is a prioritized list of rules. Each rule:
- has a `name`,
- selects org units either by a set of AND'ed conditions on data layers (`matching_criteria`), or by
  matching every org unit in the account (`is_match_all: true`) - a rule uses one or the other, never
  both,
- assigns one or more `interventions` to every org unit it selects.

Rules are listed from lowest to highest priority (the last rule in the list has the highest priority).
When an org unit is matched by more than one rule, here is how their interventions combine:
- Interventions from DIFFERENT intervention categories are always merged - every one of them is
  applied to that org unit, regardless of priority.
- Interventions from the SAME intervention category conflict: only the highest-priority rule's
  intervention for that category is applied to that org unit. Every lower-priority rule's
  intervention for that same category is dropped for that org unit only - those rules still apply
  normally to any org unit the higher-priority rule doesn't match, and to any other category they
  assign.
- Never assign two interventions from the same category within a single rule - only one of them
  (arbitrarily) would actually take effect, so pick the one intervention you actually want instead.

## Available data layers for this account
{metric_types_catalog}

## Available interventions for this account
{interventions_catalog}

## Available colors
{colors_catalog}

Always respond with ONLY the JSON below - no text before or after it, not even a short acknowledgment
or lead-in sentence. Put all user-facing text in the `message` field - whether that's an explanation of
the rules you created/changed, or a short intro to a clarifying question. Whenever you do return rules,
return the COMPLETE set for the scenario, ordered from lowest to highest priority - not just the ones
that changed:
{
  "rules": [
    {
      "id": <id of an existing rule from "Current rules" below, to modify it - omit entirely for a new rule>,
      "name": "<short name describing what the rule DOES, not its criteria>",
      "is_match_all": false,
      "matching_criteria": [
        {"metric_type": <id from the data layer catalog above, as an integer>, "operator": "<one of ==, <=, >=, <, >>", "value": <number>}
      ],
      "interventions": [<id from the interventions catalog above, as an integer>, ...],
      "color": "<required - a hex value from the color palette above, chosen to suit this rule and stay distinct from the others>"
    }
  ] or null if this turn has no rules to save,
  "message": "<your explanation, or a short intro if you're asking clarifying questions>",
  "quick_replies": [
    {"question": "<short question label>", "options": ["<short candidate answer>", "<short candidate answer>", ...]},
    ...
  ] or null
}
Use `quick_replies` when the user needs to choose between a few concrete, mutually exclusive options to
proceed (e.g. specific data layer or intervention names, thresholds, which rule to change) - one entry
per question, at most 5 questions total, 2-6 short options each, exactly one pick expected per question.
Omit it (null) when the request is clear enough to just create/update the rules, or the missing
information isn't a short pick-one list (e.g. needs a free-form number).
Never prefix a `question` or an `option` with a letter or number (no "a.", "1)", "Option 2:", etc.) - the
UI numbers/distinguishes them structurally, so both fields must be the clean label text only.

## Rules
- Only reference metric type ids that appear in the data layer catalog above, and intervention ids that
  appear in the interventions catalog above.
- A rule's `matching_criteria` conditions are implicitly AND'ed - a rule matches an org unit only if
  every condition is true for it. Use `is_match_all: true` instead of `matching_criteria` for a rule
  that should apply to every org unit; a rule cannot use both, and a non-match-all rule needs at least
  one condition.
- A condition's value is a number (`value`), unless the data layer is marked "categorical" in the
  catalog above (e.g. produced by a `classify` composite layer), in which case use one of its listed
  valid values as a text label (`string_value`) instead. A categorical condition's operator MUST be
  "==" - categorical values have no numeric order, so <, <=, >, >= are never valid for them.
- Every rule MUST assign at least one intervention - `interventions` may never be empty, for
  match-all rules included. A rule with no interventions matches org units but does nothing (a
  no-op): never create, suggest, or leave in place a rule with an empty `interventions` list, even as
  a placeholder "baseline" rule - a baseline rule still needs a real intervention (e.g. basic case
  management) to have any purpose.
- To modify an existing rule (visible in "Current rules" below), include its `id` and repeat every field
  as you want it to end up, not just the changed field - the returned rule replaces it entirely.
- To remove an existing rule, simply omit it from the returned list.
- A rule's `name` should be short and describe what the rule DOES - e.g. the intervention(s) it
  assigns, or its role in the scenario - not restate its `matching_criteria`, which is already shown
  next to the name in the UI. For example, prefer "SMC rollout" or "Bednets - peak season" over
  "High risk areas" or "Rainfall > 100" for a rule assigning SMC/bednets.
- Always set a `color` for every rule - it is required, not optional. `color` is purely cosmetic (used
  to tell rules apart on the map/list) and has no effect on matching or interventions, but you must
  still choose deliberately: pick a color that suits the rule's role using your own judgement (e.g.
  shades of red/orange for higher-severity or higher-priority rules, green/blue for lower-risk or
  routine ones), and keep every rule in your response visually distinct from the others - never reuse
  the same color for two rules in the same response unless the user explicitly asks you to. Only ever
  use a value from the color palette above - never invent a hex code that isn't listed there. When
  modifying an existing rule, keep its current color unless the user asks you to change it or the
  overall set needs rebalancing for distinctness.
- If the request is ambiguous, or references a data layer or intervention that doesn't exist, set `rules`
  to null, and either ask directly in `message` or - when there's a short enumerable set of good candidate
  answers - use `quick_replies` instead of guessing.
- In the `message` field (and in any plain-text clarifying question), never write a numeric id, for
  any reason - not even in parentheses to disambiguate two data layers or interventions that happen to
  share the same name (e.g. never write "'TEST' (id 97)"). The user reading it has no way to look up
  what an id refers to - ids exist only in the `matching_criteria`/`interventions` fields of the JSON,
  never in text a person reads. If two or more catalog entries share the exact same name, say so in
  words instead - e.g. "there are two data layers both named 'TEST' - ask your administrator to rename
  one so they can be told apart" - and either ask the user which one they mean, or pick one and explain
  your choice using its description or other distinguishing detail from the catalog, never its id.
"""

CURRENT_RULES_SECTION = """

## Current rules for this scenario
The scenario currently has these rules (same JSON schema as your "rules" responses, ordered from lowest
to highest priority). Treat requests to change, add, or remove rules as modifications of this set, and
always return the COMPLETE updated set of rules, not just the ones that changed:
"""


class MatchingCriterionSpec(BaseModel, extra="allow"):
    metric_type: int
    operator: str
    value: Optional[float] = None
    string_value: Optional[str] = None


class GeneratedScenarioRuleSpec(BaseModel, extra="allow"):
    id: Optional[int] = None
    name: str
    is_match_all: bool = False
    matching_criteria: list[MatchingCriterionSpec] = Field(default_factory=list)
    interventions: list[int] = Field(default_factory=list)
    color: Optional[str] = None


class GeneratedScenarioRulesResponse(BaseModel):
    message: str
    rules: Optional[list[GeneratedScenarioRuleSpec]] = None
    quick_replies: Optional[list[QuickReplyQuestion]] = quick_replies_field()


def _build_metric_types_catalog(metric_types: list[dict]) -> str:
    if not metric_types:
        return "(no data layers available for this account)"

    lines = []
    for metric_type in metric_types:
        line = f'- id={metric_type["id"]}, name="{metric_type["name"]}"'
        if metric_type.get("description"):
            line += f', description="{metric_type["description"]}"'

        # legend_config.domain is the same catalog the manual rule form's value dropdown is built
        # from (MatchingCriterionForm.tsx) - reusing it here is what tells the AI which string_value
        # labels are actually valid for a categorical layer, and gives it a sense of scale for
        # numeric ones, instead of guessing thresholds blind.
        domain = (metric_type.get("legend_config") or {}).get("domain")
        if metric_type.get("legend_type") == "ordinal" and domain:
            categories = ", ".join(f'"{value}"' for value in domain)
            line += f', categorical - valid values: [{categories}] (use operator "==" with string_value only)'
        elif domain and len(domain) >= 2:
            line += f", typical value range: {domain[0]} to {domain[-1]}"

        lines.append(line)
    return "\n".join(lines)


def _build_interventions_catalog(interventions: list[dict]) -> str:
    if not interventions:
        return "(no interventions available for this account)"

    by_category: dict[str, list[dict]] = {}
    for intervention in interventions:
        by_category.setdefault(intervention["category_name"], []).append(intervention)

    lines = []
    for category_name, items in by_category.items():
        lines.append(f"{category_name}:")
        for item in items:
            lines.append(f'  - id={item["id"]}, name="{item["name"]}"')
    return "\n".join(lines)


def _build_colors_catalog() -> str:
    # The palette is a fixed, global list (not account-specific), same one the manual color picker
    # (ColorPicker) and _pick_new_rule_color's auto-assignment draw from - never built from
    # account data, so this needs no argument.
    return "\n".join(f'- value="{hex_code}", name="{label}"' for hex_code, label in COLOR_CHOICES)


def build_static_system_prompt(metric_types: list[dict], interventions: list[dict]) -> str:
    """Build the part of the system prompt that's static for a given account: the instructional
    template with its data layer, intervention, and color catalogs substituted in. Unlike the
    current rules (see `build_system_blocks`), this is identical across every turn of a session and
    across sessions for the same account, which is what makes it worth caching as its own block."""
    return (
        SCENARIO_RULE_SYSTEM_PROMPT_TEMPLATE.replace(
            METRIC_TYPES_CATALOG_PLACEHOLDER, _build_metric_types_catalog(metric_types)
        )
        .replace(INTERVENTIONS_CATALOG_PLACEHOLDER, _build_interventions_catalog(interventions))
        .replace(COLORS_CATALOG_PLACEHOLDER, _build_colors_catalog())
    )


def build_system_blocks(
    metric_types: list[dict],
    interventions: list[dict],
    current_rules: Optional[list[dict]] = None,
) -> list[dict]:
    """Build the `system` param as content blocks. The static template+catalogs are marked as a
    single cached block, since a chat session resends the same system prompt on every turn - only
    the current rules change turn to turn, so they're appended uncached after the cache breakpoint
    rather than invalidating the cache every time the user edits the rule set."""
    blocks = [
        {
            "type": "text",
            "text": build_static_system_prompt(metric_types, interventions),
            # 1h rather than the 5m default: turns in this chat are often minutes apart (the user
            # reviews the generated rules in the editor between messages), so the short-lived
            # default would frequently miss and pay full cache-write price on every turn anyway.
            "cache_control": {"type": "ephemeral", "ttl": "1h"},
        }
    ]
    if current_rules:
        blocks.append({"type": "text", "text": CURRENT_RULES_SECTION + json.dumps(current_rules, indent=2)})
    return blocks


def call_claude(
    message: str,
    conversation_history: list[dict],
    metric_types: list[dict],
    interventions: list[dict],
    api_key: Optional[str] = None,
    current_rules: Optional[list[dict]] = None,
    attachments: Optional[list[dict]] = None,
) -> str:
    """Call Claude API with the conversation and return the raw response text."""
    client = anthropic.Anthropic(api_key=api_key)

    response = client.beta.messages.create(
        model=settings.SCENARIO_RULE_AI_MODEL,
        max_tokens=4096,
        system=build_system_blocks(metric_types, interventions, current_rules=current_rules),
        messages=build_conversation(message, conversation_history, attachments),
        betas=[ANTHROPIC_FILES_BETA],
    )

    return response.content[0].text


def parse_scenario_rules_response(response_text: str) -> GeneratedScenarioRulesResponse:
    """Parse Claude's response into a GeneratedScenarioRulesResponse.

    Every well-formed reply is a single JSON envelope, whether it's a rules turn (`rules` set) or a
    clarifying-question turn (`rules: null`, optionally with `quick_replies`). Raises
    `json.JSONDecodeError` if no JSON object could be found/parsed at all, or
    `pydantic.ValidationError` if JSON was found but doesn't match the response schema - callers
    should treat these two cases differently, see `generate_scenario_rules`. Either exception gets the
    extracted text attached (`extracted_text` / `raw_data`), so a caller can tell a genuinely
    conversational reply apart from a botched rules attempt without re-extracting `response_text`
    itself, and can still recover e.g. the model's own `message`/`quick_replies` from a
    schema-invalid-but-parseable response.
    """
    extracted_text = extract_json_text(response_text)
    try:
        data = json.loads(extracted_text)
    except json.JSONDecodeError as e:
        e.extracted_text = extracted_text
        raise
    try:
        return GeneratedScenarioRulesResponse(**data)
    except ValidationError as e:
        e.raw_data = data
        raise


def _rules_response(assistant_message: str, conversation_history: list[dict], *, rules=None, quick_replies=None):
    return {
        "assistant_message": assistant_message,
        "rules": rules,
        "quick_replies": quick_replies,
        "conversation_history": conversation_history,
    }


def generate_scenario_rules(
    message: str,
    conversation_history: list[dict],
    metric_types: list[dict],
    interventions: list[dict],
    api_key: Optional[str] = None,
    current_rules: Optional[list[dict]] = None,
    attachments: Optional[list[dict]] = None,
) -> dict:
    """Call the AI and return the parsed rule set plus updated conversation history.

    Returns a dict with:
    - assistant_message: The agent's response text
    - rules: the generated list of rule specs (None on a clarifying-question turn)
    - quick_replies: a list of {question, options} groups to render as selectable buttons (None if
      the model didn't offer any)
    - conversation_history: Updated conversation history
    """
    response_text = call_claude(
        message,
        conversation_history,
        metric_types,
        interventions,
        api_key=api_key,
        current_rules=current_rules,
        attachments=attachments,
    )

    new_history = append_turn(conversation_history, message, response_text, attachments)

    try:
        parsed = parse_scenario_rules_response(response_text)
        return _rules_response(
            parsed.message,
            new_history,
            rules=[rule.model_dump() for rule in parsed.rules] if parsed.rules is not None else None,
            quick_replies=[q.model_dump() for q in parsed.quick_replies] if parsed.quick_replies else None,
        )
    except json.JSONDecodeError as e:
        extracted_text = getattr(e, "extracted_text", "")
        if extracted_text.startswith("{"):
            # Looked like an attempted rule set (starts with the JSON object the prompt demands) but
            # failed to even parse as JSON - never show that raw, broken text to the user.
            logger.warning("Response looked like a rules attempt but wasn't valid JSON: %s", e)
            return _rules_response(RULES_PARSE_FAILURE_MESSAGE, new_history)
        # Genuinely conversational reply, no JSON found - see parse_scenario_rules_response.
        logger.info("Response was not a scenario rule set (likely conversational): %s", e)
        return _rules_response(response_text, new_history)
    except ValidationError as e:
        # JSON found but schema-invalid - fall back to the model's own "message" (still on
        # e.raw_data, see parse_scenario_rules_response) rather than showing raw JSON.
        logger.warning("Response had JSON that didn't match the rules schema: %s", e)
        raw_data = getattr(e, "raw_data", {})
        return _rules_response(
            raw_data.get("message") or RULES_PARSE_FAILURE_MESSAGE,
            new_history,
            quick_replies=parse_quick_replies(raw_data),
        )
