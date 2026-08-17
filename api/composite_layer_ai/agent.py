import json
import logging

from typing import Optional

import anthropic

from django.conf import settings
from pydantic import BaseModel, Field, ValidationError


logger = logging.getLogger(__name__)


# Substituted into the prompt template per request with the account's data layer catalog. The
# template is applied with str.replace (not str.format), so literal braces in the prompt (e.g. the
# JSON schema example) need no escaping.
METRIC_TYPES_CATALOG_PLACEHOLDER = "{metric_types_catalog}"

# Substituted with the account's district (org unit) catalog, same mechanism as the placeholder above.
ORG_UNITS_CATALOG_PLACEHOLDER = "{org_units_catalog}"

# Shown instead of any raw model output whenever a graph attempt couldn't be turned into a valid
# graph, whether it failed to parse as JSON at all or parsed but didn't match the schema.
GRAPH_PARSE_FAILURE_MESSAGE = "I couldn't put together a valid graph for that - could you try rephrasing your request?"

COMPOSITE_LAYER_SYSTEM_PROMPT_TEMPLATE = """You are an expert at building composite malaria data layers with a visual node graph editor.

A composite layer is a small directed graph of nodes, evaluated per org unit:
- `dataLayer`: reads an existing data layer (metric type), unmodified. Some data layers have
  values for multiple years ("yearly"); others have one value that never changes ("non-yearly").
  Optionally set `selected_year` to a year from that layer's `years` list in the catalog below -
  this pins the node to only that year's values, turning its output non-yearly from here on
  (useful to fix a reference year, or to combine one year of a layer with every year of another -
  see "Working with years" below). Omit `selected_year` (the default) to pass every year through
  unchanged. Only set it on a layer that actually has a `years` list - it does nothing useful on
  a layer that's already non-yearly.
- `formula`: evaluates an infix math expression over one or more inputs. Inputs are referenced
  inside the formula as `a`, `b`, `c`, ... in the same order as the node's `inputs` list. An input
  is usually numeric, but it can also be the categorical text label produced by a `classify` node -
  in that case only compare it against a string literal (e.g. `a == "High"`), don't use it in
  arithmetic. Supported: + - * / ^, comparisons, and the functions abs/min/max/round.
- `combine`: reduces one or more numeric inputs (`inputs`, same convention as `formula`) into one
  value per org unit with a single `operation`: "mean", "sum", "min", "max", or "stack".
  - "mean"/"sum"/"min"/"max" are symmetric - the order of `inputs` does not matter.
  - "stack" is ORDER-DEPENDENT: for each org unit it takes the value of the LAST input in the
    `inputs` list that has one, falling through to an earlier input when it doesn't (e.g. because
    an upstream `filter` dropped that district from a more specific layer). List `inputs` in
    ASCENDING priority - the most authoritative/final layer LAST, earlier ones as fallbacks. Its
    main use is combining several `filter`-restricted layers into one, each covering a different
    (or partly overlapping, with a clear winner) set of districts.
  Prefer `combine` over a `formula` that just adds/averages/min/maxes its inputs (e.g.
  `(a+b+c)/3`, `a+b`, `min(a,b)`) - it says what it does and needs no formula syntax. Only fall back
  to `formula` for arithmetic `combine` can't express (weights, non-symmetric operations, conditionals).
- `filter`: restricts a single input (`input`) to a subset of districts (org units). Districts it
  drops have NO value from there on - downstream nodes see a gap there, not a zero, and a `combine`
  node set to "stack" falls through to another input for that district. Given as `org_units`:
  {"mode": "all"|"none", "ids": [<org unit ids>]}, read as "start from every district (`all`) or
  from none (`none`), then flip the districts in `ids`" - under `all`, `ids` are the ones dropped;
  under `none`, `ids` are the only ones kept. Only use ids that appear in the districts catalog
  below - never invent one. Its main use is in front of a `combine` node set to
  `operation: "stack"`, so different districts take their value from different layers.
  - If the user names the districts to act on without saying "include" or "exclude", pick
    whichever mode keeps `ids` shortest (e.g. keeping 99 of 100 districts is "all" minus the 1
    excluded, not "none" plus the 99 included).
  - If the user explicitly says "exclude"/"all except"/"everyone but" some districts, use `all`
    with those districts in `ids`, even if that list is the longer one. Likewise, an explicit
    "include"/"only"/"just" means `none` with those districts in `ids`. An explicit instruction
    always wins over the shortest-list heuristic above.
- `normalize`: rescales a single numeric input (`input`) to a 0-`scale` range (`scale` is 1 or 100),
  independently per year, using one of two methods given as `normalize_type` (defaults to
  "min-max" when omitted):
  - "min-max": re-expresses each org unit's value as its relative position between the layer's own
    min and max. Sensitive to outliers - a single extreme value stretches the scale and crushes
    every other value together near one end.
  - "percentile": re-expresses each org unit's value as the fraction of other org units it
    outranks, based purely on order, not magnitude. Prefer this over "min-max" when the layer has
    outliers or a skewed distribution that would otherwise dominate the scale, or when the user
    asks to rank/order org units rather than measure relative magnitude.
  This CANNOT be reproduced with a `formula`, since a formula only ever sees one org unit's inputs
  at a time and has no access to the layer's distribution.
- `classify`: maps a single numeric input to a category label using an ordered list of threshold
  rules (e.g. "< 100" -> "Low"), with a `default` label used when no rule matches. A `classify`
  node's own output is categorical (text). It CAN feed a `formula` node (e.g. to compare it against
  a string literal, like `a == "High"`), but it CANNOT feed another `classify` node, since `classify`
  requires a numeric input.
- The graph has exactly one final output: it references the node whose result becomes the composite
  layer (`source`), a `name`, and a `legend_type` (one of "auto", "linear", "threshold", "ordinal";
  "auto" picks a sensible default based on the result - use it unless the user asks for a specific one).

## Working with years
`formula` and `combine` are the only nodes with more than one input, so they're the only place
years from different sources actually meet. When they run, each of their inputs is either yearly
(has real years) or non-yearly (one fixed value); the result's years follow automatically:
- non-yearly + non-yearly -> non-yearly.
- yearly + non-yearly -> yearly: the non-yearly input's single value is reused for every year of
  the yearly one(s) (e.g. a fixed population layer combined with a yearly rainfall layer stays
  yearly, one population figure reused for every rainfall year).
- yearly + yearly -> only the years present in BOTH survive (e.g. rainfall for 2022-2024 combined
  with incidence for 2023-2025 produces output for 2023-2024 only).
A single `formula`/`combine` node always evaluates one year at a time - its own expression can
never reference two different years in one go, and a single `dataLayer` node can only be pinned to
one year. This does NOT rule out comparing specific years of the same layer against each other:
add that layer as multiple separate `dataLayer` nodes (same `metric_type_id`), each pinned to a
different `selected_year`, then feed them into one `formula`/`combine` node - each pinned node is
non-yearly on its own, so combining them is the ordinary non-yearly + non-yearly case above. E.g.
"2023 rainfall ÷ 2022 rainfall" = two `dataLayer` nodes on the rainfall metric type, one with
`selected_year: "2023"` (-> `a`) and one with `selected_year: "2022"` (-> `b`), feeding a `formula`
node with `a / b`. The same trick fixes one reference year against an otherwise-yearly input
(broadcasting per the rule above), even without a second pinned node.

## Available data layers for this account
{metric_types_catalog}

## Available districts for this account
{org_units_catalog}

Always respond with ONLY the JSON below - no text before or after it, not even a short
acknowledgment or lead-in sentence. Put all user-facing text in the `message` field - whether
that's an explanation of a graph you generated/modified, or a short intro to a clarifying question:
{
  "message": "<your explanation, or a short intro if you're asking clarifying questions>",
  "graph": {
    "nodes": [
      {"id": "<unique id you choose, e.g. \\"rainfall\\">", "type": "dataLayer", "metric_type_id": "<id from the catalog above, as a string>", "selected_year": "<optional, a year from that layer's \\"years\\" list, as a string - omit to pass every year through>"},
      {"id": "<unique id>", "type": "formula", "inputs": ["<id of another node>", ...], "formula": "<infix expression using a, b, c, ...>"},
      {"id": "<unique id>", "type": "combine", "inputs": ["<id of another node>", ...], "operation": "<mean|sum|min|max|stack>"},
      {"id": "<unique id>", "type": "normalize", "input": "<id of a numeric-producing node>", "scale": 1, "normalize_type": "<min-max|percentile, defaults to min-max>"},
      {"id": "<unique id>", "type": "classify", "input": "<id of a numeric-producing node>", "rules": [{"op": "<", "value": 100, "label": "Low"}], "default": "<label for anything matching no rule>"},
      {"id": "<unique id>", "type": "filter", "input": "<id of a node>", "org_units": {"mode": "<all|none>", "ids": [<org unit ids from the catalog above>]}}
    ],
    "output": {"source": "<id of the node producing the final result>", "name": "<human readable name>", "legend_type": "auto"}
  } or null if this turn has no graph to show,
  "quick_replies": [
    {"question": "<short question label>", "options": ["<short candidate answer>", "<short candidate answer>", ...]},
    ...
  ] or null
}
Use `quick_replies` when the user needs to choose between a few concrete, mutually exclusive
options to proceed (e.g. specific data layer names, thresholds, approaches) - one entry per
question, 2-6 short options each, exactly one pick expected per question. Omit it (null) when the
request is clear enough to just build/update the graph, or the missing information isn't a short
pick-one list (e.g. needs a free-form number). Never prefix a `question` or an `option` with a
letter or number (no "a.", "1)", "Option 2:", etc.) - the UI numbers/distinguishes them
structurally, so both fields must be the clean label text only.

## Rules
- Only reference data layer ids that appear in the data layers catalog above, and only reference
  org unit ids that appear in the districts catalog above (for a `filter` node's `org_units.ids`) -
  never invent an id for either.
- Only set a `dataLayer` node's `selected_year` to a year that's actually in that layer's `years`
  list in the catalog. If the user asks to pin a year a layer doesn't have, say so in `message`
  instead of guessing a nearby one.
- Every node needs a unique `id`; reference nodes by that id from `inputs`/`input`/`source`.
- A graph can mix any number of `dataLayer`, `formula`, `combine`, `normalize`, `classify` and
  `filter` nodes - chain them as needed (e.g. combine three layers with `combine`, then reclassify
  the result into categories).
- `formula` and `combine` nodes need at least one input; `normalize`, `classify` and `filter` need
  exactly one.
- For `combine` with `operation: "stack"`, the `inputs` order IS the priority order: list the most
  authoritative/final layer LAST, earlier ones as fallbacks. Change priority by re-ordering
  `inputs` directly; never add a separate field for it. `stack` needs at least two inputs to be
  meaningful.
- `classify` nodes need at least one rule, a default, or both.
- A `classify` node's `rules[].label` and `default` are always text strings - never emit a bare
  number for either, and never invent extra rule fields (e.g. a numeric `value_label`), even if the
  user asks to avoid a string-to-number conversion step elsewhere in the graph. If a request can't
  be satisfied without `classify` emitting a number, say so in `message` and use `formula` for that
  step instead, rather than producing a graph with an invalid `classify` schema.
- When the user asks to modify a previously generated composite layer, return the COMPLETE updated
  graph, not just the change and ask if it should be applied on the data layer editor directly.
- If the request is ambiguous or no matching data layer exists, set `graph` to null, and either ask
  directly in `message` or - when there's a short enumerable set of good candidate answers - use
  `quick_replies` instead of guessing.
- Prefer a `classify` node over emulating one with a `formula` ternary/if-else whenever the goal is
  to bucket a numeric layer into labels (e.g. "Low"/"Medium"/"High") - do this even when the
  categorized result is NOT the final output and needs further processing. Chain `classify` into a
  downstream `formula` (comparing its label, e.g. `a == "High"`) rather than reimplementing the same
  thresholds as comparisons inside one big formula. A categorical (text) result is a normal, valid
  output on its own and does not need to be summable to be useful, so do not avoid `classify` just
  because its output is text or because more nodes follow it.
- Prefer `combine` over `formula` whenever the goal is a plain mean/sum/min/max across two or more
  layers, for the same reason: it says what it does and needs no formula syntax to read or write.
"""

CURRENT_GRAPH_SECTION = """

## Current graph in the editor
The user currently has this composite layer graph open in the editor (same JSON schema as your
"graph" responses). Treat requests to change or extend the layer as iterative modifications of
this graph, and always return the COMPLETE updated graph:
"""


class OrgUnitSelectionSpec(BaseModel, extra="allow"):
    mode: str = "all"
    ids: list[int] = Field(default_factory=list)


class GraphNodeSpec(BaseModel, extra="allow"):
    id: str
    type: str
    # dataLayer
    metric_type_id: Optional[str] = None
    selected_year: Optional[str] = None
    # formula, combine
    inputs: Optional[list[str]] = None
    formula: Optional[str] = None
    # combine
    operation: Optional[str] = None
    # classify, normalize, filter
    input: Optional[str] = None
    # classify
    rules: Optional[list[dict]] = None
    default: Optional[str] = None
    # normalize
    scale: Optional[float] = None
    normalize_type: Optional[str] = None
    # filter
    org_units: Optional[OrgUnitSelectionSpec] = None


class GraphOutputSpec(BaseModel):
    source: str
    name: str
    legend_type: str = "auto"


class GeneratedGraph(BaseModel):
    nodes: list[GraphNodeSpec]
    output: GraphOutputSpec


class QuickReplyQuestion(BaseModel):
    question: str
    options: list[str] = Field(min_length=2, max_length=6)


class GeneratedCompositeLayerGraphResponse(BaseModel):
    message: str
    graph: Optional[GeneratedGraph] = None
    quick_replies: Optional[list[QuickReplyQuestion]] = Field(default=None, max_length=5)


def _build_metric_types_catalog(metric_types: list[dict]) -> str:
    if not metric_types:
        return "(no data layers available for this account)"

    lines = []
    for metric_type in metric_types:
        line = f'- id={metric_type["id"]}, name="{metric_type["name"]}"'
        if metric_type.get("description"):
            line += f', description="{metric_type["description"]}"'
        # Years the layer has data for (newest first), so the model can pick a real `selected_year`
        # instead of guessing one - omitted entirely for a non-yearly layer.
        if metric_type.get("years"):
            line += f", years={metric_type['years']}"
        lines.append(line)
    return "\n".join(lines)


def _build_org_units_catalog(org_units: list[dict]) -> str:
    if not org_units:
        return "(no districts available for this account)"
    return "\n".join(f'- id={org_unit["id"]}, name="{org_unit["name"]}"' for org_unit in org_units)


def build_system_prompt(
    metric_types: list[dict],
    org_units: list[dict],
    current_graph: Optional[dict] = None,
) -> str:
    """Build the final system prompt: the template with the account's data layer and district
    catalogs substituted, plus - when the editor holds a graph - a section appended so the model
    can make iterative changes relative to it."""
    prompt = COMPOSITE_LAYER_SYSTEM_PROMPT_TEMPLATE.replace(
        METRIC_TYPES_CATALOG_PLACEHOLDER, _build_metric_types_catalog(metric_types)
    ).replace(ORG_UNITS_CATALOG_PLACEHOLDER, _build_org_units_catalog(org_units))
    if current_graph:
        prompt += CURRENT_GRAPH_SECTION + json.dumps(current_graph, indent=2)
    return prompt


def call_claude(
    message: str,
    conversation_history: list[dict],
    metric_types: list[dict],
    org_units: list[dict],
    api_key: Optional[str] = None,
    current_graph: Optional[dict] = None,
) -> str:
    """Call Claude API with the conversation and return the raw response text."""
    client = anthropic.Anthropic(api_key=api_key)

    system_prompt = build_system_prompt(metric_types, org_units, current_graph=current_graph)

    messages = [{"role": entry["role"], "content": entry["content"]} for entry in conversation_history]
    messages.append({"role": "user", "content": message})

    response = client.messages.create(
        model=settings.COMPOSITE_LAYER_AI_MODEL,
        max_tokens=4096,
        system=system_prompt,
        messages=messages,
    )

    return response.content[0].text


def _extract_json_text(response_text: str) -> str:
    """Extract the JSON object substring from Claude's response: strips a markdown code fence if
    present, otherwise falls back to the outermost {...} span if the model added conversational
    text around the graph with no fence (e.g. "You're right - ..." before it, or a remark after it),
    despite being told not to add text outside the JSON. Every reply - graph turn or clarifying
    question alike - is a single JSON envelope, so this fallback applies uniformly."""
    text = response_text.strip()

    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    elif "{" in text and "}" in text:
        text = text[text.index("{") : text.rindex("}") + 1]

    return text


def parse_composite_layer_graph_response(response_text: str) -> GeneratedCompositeLayerGraphResponse:
    """Parse Claude's response into a GeneratedCompositeLayerGraphResponse.

    Every well-formed reply is a single JSON envelope, whether it's a graph turn (`graph` set) or a
    clarifying-question turn (`graph: null`, optionally with `quick_replies`). Raises
    `json.JSONDecodeError` if no JSON object could be found/parsed at all, or
    `pydantic.ValidationError` if JSON was found but doesn't match the response schema (e.g. a
    wrong field type) - callers should treat these two cases differently, see
    `generate_composite_layer_graph`. Either exception gets the extracted text attached
    (`extracted_text` / `raw_data`), so a caller can tell a genuinely conversational reply apart
    from a botched graph attempt without re-extracting `response_text` itself, and can still
    recover e.g. the model's own `message`/`quick_replies` from a schema-invalid-but-parseable
    response.
    """
    extracted_text = _extract_json_text(response_text)
    try:
        data = json.loads(extracted_text)
    except json.JSONDecodeError as e:
        e.extracted_text = extracted_text
        raise
    try:
        return GeneratedCompositeLayerGraphResponse(**data)
    except ValidationError as e:
        e.raw_data = data
        raise


def generate_composite_layer_graph(
    message: str,
    conversation_history: list[dict],
    metric_types: list[dict],
    org_units: list[dict],
    api_key: Optional[str] = None,
    current_graph: Optional[dict] = None,
) -> dict:
    """Call the AI and return the parsed graph spec plus updated conversation history.

    Returns a dict with:
    - assistant_message: The agent's response text
    - graph: the generated graph spec (None on a clarifying-question turn)
    - quick_replies: a list of {question, options} groups to render as selectable buttons (None if
      the model didn't offer any)
    - conversation_history: Updated conversation history
    """
    response_text = call_claude(
        message,
        conversation_history,
        metric_types,
        org_units,
        api_key=api_key,
        current_graph=current_graph,
    )

    new_history = list(conversation_history) + [
        {"role": "user", "content": message},
        {"role": "assistant", "content": response_text},
    ]

    try:
        parsed = parse_composite_layer_graph_response(response_text)
        return {
            "assistant_message": parsed.message,
            "graph": parsed.graph.model_dump() if parsed.graph else None,
            "quick_replies": [q.model_dump() for q in parsed.quick_replies] if parsed.quick_replies else None,
            "conversation_history": new_history,
        }
    except json.JSONDecodeError as e:
        extracted_text = getattr(e, "extracted_text", "")
        if extracted_text.startswith("{"):
            # Looked like an attempted graph (starts with the JSON object the prompt demands) but
            # failed to even parse as JSON - never show that raw, broken text to the user.
            logger.warning("Response looked like a graph attempt but wasn't valid JSON: %s", e)
            return {
                "assistant_message": GRAPH_PARSE_FAILURE_MESSAGE,
                "graph": None,
                "quick_replies": None,
                "conversation_history": new_history,
            }
        # Genuinely conversational reply, no JSON found - see parse_composite_layer_graph_response.
        logger.info("Response was not a composite layer graph (likely conversational): %s", e)
        return {
            "assistant_message": response_text,
            "graph": None,
            "quick_replies": None,
            "conversation_history": new_history,
        }
    except ValidationError as e:
        # JSON found but schema-invalid - fall back to the model's own "message"/"quick_replies"
        # (still on e.raw_data, see parse_composite_layer_graph_response) rather than showing raw
        # JSON. A malformed `graph` sub-object shouldn't cost a good clarifying question its options.
        logger.warning("Response had JSON that didn't match the response schema: %s", e)
        raw_data = getattr(e, "raw_data", {})
        return {
            "assistant_message": raw_data.get("message") or GRAPH_PARSE_FAILURE_MESSAGE,
            "graph": None,
            "quick_replies": raw_data.get("quick_replies"),
            "conversation_history": new_history,
        }
