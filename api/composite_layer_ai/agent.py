import json
import logging

from typing import Optional

import anthropic

from django.conf import settings
from pydantic import BaseModel


logger = logging.getLogger(__name__)


# Substituted into the prompt template per request with the account's data layer catalog. The
# template is applied with str.replace (not str.format), so literal braces in the prompt (e.g. the
# JSON schema example) need no escaping.
METRIC_TYPES_CATALOG_PLACEHOLDER = "{metric_types_catalog}"

COMPOSITE_LAYER_SYSTEM_PROMPT_TEMPLATE = """You are an expert at building composite malaria data layers with a visual node graph editor.

A composite layer is a small directed graph of nodes, evaluated per org unit:
- `dataLayer`: reads an existing data layer (metric type), unmodified.
- `formula`: evaluates an infix math expression over one or more inputs. Inputs are referenced
  inside the formula as `a`, `b`, `c`, ... in the same order as the node's `inputs` list. An input
  is usually numeric, but it can also be the categorical text label produced by a `classify` node -
  in that case only compare it against a string literal (e.g. `a == "High"`), don't use it in
  arithmetic. Supported: + - * / ^, comparisons, and the functions abs/min/max/round.
- `combine`: reduces one or more numeric inputs (`inputs`, same convention as `formula`) into one
  value per org unit with a single symmetric operation, given as `operation`: "mean", "sum", "min",
  or "max". Prefer `combine` over a `formula` that just adds/averages/min/maxes its inputs (e.g.
  `(a+b+c)/3`, `a+b`, `min(a,b)`) - it says what it does and needs no formula syntax. Only fall back
  to `formula` for arithmetic `combine` can't express (weights, non-symmetric operations, conditionals).
- `normalize`: min-max rescales a single numeric input (`input`) to a 0-`scale` range (`scale` is 1
  or 100), independently per year - i.e. it re-expresses each org unit's value as its relative
  position between the layer's min and max. This CANNOT be reproduced with a `formula`, since a
  formula only ever sees one org unit's inputs at a time and has no access to the layer's min/max.
- `classify`: maps a single numeric input to a category label using an ordered list of threshold
  rules (e.g. "< 100" -> "Low"), with a `default` label used when no rule matches. A `classify`
  node's own output is categorical (text). It CAN feed a `formula` node (e.g. to compare it against
  a string literal, like `a == "High"`), but it CANNOT feed another `classify` node, since `classify`
  requires a numeric input.
- The graph has exactly one final output: it references the node whose result becomes the composite
  layer (`source`), a `name`, and a `legend_type` (one of "auto", "linear", "threshold", "ordinal";
  "auto" picks a sensible default based on the result - use it unless the user asks for a specific one).

## Available data layers for this account
{metric_types_catalog}

When the user asks you to create or modify a composite layer, you MUST respond with valid JSON
matching this schema, and no text outside the JSON block:
{
  "graph": {
    "nodes": [
      {"id": "<unique id you choose, e.g. \\"rainfall\\">", "type": "dataLayer", "metric_type_id": "<id from the catalog above, as a string>"},
      {"id": "<unique id>", "type": "formula", "inputs": ["<id of another node>", ...], "formula": "<infix expression using a, b, c, ...>"},
      {"id": "<unique id>", "type": "combine", "inputs": ["<id of another node>", ...], "operation": "<mean|sum|min|max>"},
      {"id": "<unique id>", "type": "normalize", "input": "<id of a numeric-producing node>", "scale": 1},
      {"id": "<unique id>", "type": "classify", "input": "<id of a numeric-producing node>", "rules": [{"op": "<", "value": 100, "label": "Low"}], "default": "<label for anything matching no rule>"}
    ],
    "output": {"source": "<id of the node producing the final result>", "name": "<human readable name>", "legend_type": "auto"}
  },
  "message": "<your explanation to the user of what you created or changed>"
}

## Rules
- Only reference data layer ids that appear in the catalog above.
- Every node needs a unique `id`; reference nodes by that id from `inputs`/`input`/`source`.
- A graph can mix any number of `dataLayer`, `formula`, `combine`, `normalize` and `classify` nodes -
  chain them as needed (e.g. combine three layers with `combine`, then reclassify the result into
  categories).
- `formula` and `combine` nodes need at least one input; `normalize` and `classify` need exactly one.
- `classify` nodes need at least one rule, a default, or both.
- When the user asks to modify a previously generated composite layer, return the COMPLETE updated
  graph, not just the change and ask if it should be applied on the data layer editor directly.
- If the request is ambiguous or no matching data layer exists, respond with plain text asking a
  clarifying question instead of JSON.
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


class GraphNodeSpec(BaseModel, extra="allow"):
    id: str
    type: str
    # dataLayer
    metric_type_id: Optional[str] = None
    # formula, combine
    inputs: Optional[list[str]] = None
    formula: Optional[str] = None
    # combine
    operation: Optional[str] = None
    # classify, normalize
    input: Optional[str] = None
    # classify
    rules: Optional[list[dict]] = None
    default: Optional[str] = None
    # normalize
    scale: Optional[float] = None


class GraphOutputSpec(BaseModel):
    source: str
    name: str
    legend_type: str = "auto"


class GeneratedGraph(BaseModel):
    nodes: list[GraphNodeSpec]
    output: GraphOutputSpec


class GeneratedCompositeLayerGraphResponse(BaseModel):
    graph: GeneratedGraph
    message: str


def _build_metric_types_catalog(metric_types: list[dict]) -> str:
    if not metric_types:
        return "(no data layers available for this account)"

    lines = []
    for metric_type in metric_types:
        line = f'- id={metric_type["id"]}, name="{metric_type["name"]}"'
        if metric_type.get("description"):
            line += f', description="{metric_type["description"]}"'
        lines.append(line)
    return "\n".join(lines)


def build_system_prompt(
    metric_types: list[dict],
    current_graph: Optional[dict] = None,
) -> str:
    """Build the final system prompt: the template with the account's data layer catalog
    substituted, plus - when the editor holds a graph - a section appended so the model can make
    iterative changes relative to it."""
    prompt = COMPOSITE_LAYER_SYSTEM_PROMPT_TEMPLATE.replace(
        METRIC_TYPES_CATALOG_PLACEHOLDER, _build_metric_types_catalog(metric_types)
    )
    if current_graph:
        prompt += CURRENT_GRAPH_SECTION + json.dumps(current_graph, indent=2)
    return prompt


def call_claude(
    message: str,
    conversation_history: list[dict],
    metric_types: list[dict],
    api_key: Optional[str] = None,
    current_graph: Optional[dict] = None,
) -> str:
    """Call Claude API with the conversation and return the raw response text."""
    client = anthropic.Anthropic(api_key=api_key)

    system_prompt = build_system_prompt(metric_types, current_graph=current_graph)

    messages = [{"role": entry["role"], "content": entry["content"]} for entry in conversation_history]
    messages.append({"role": "user", "content": message})

    response = client.messages.create(
        model=settings.COMPOSITE_LAYER_AI_MODEL,
        max_tokens=4096,
        system=system_prompt,
        messages=messages,
    )

    return response.content[0].text


def parse_composite_layer_graph_response(response_text: str) -> GeneratedCompositeLayerGraphResponse:
    """Parse Claude's response into a GeneratedCompositeLayerGraphResponse."""
    text = response_text.strip()

    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()

    data = json.loads(text)
    return GeneratedCompositeLayerGraphResponse(**data)


def generate_composite_layer_graph(
    message: str,
    conversation_history: list[dict],
    metric_types: list[dict],
    api_key: Optional[str] = None,
    current_graph: Optional[dict] = None,
) -> dict:
    """Call the AI and return the parsed graph spec plus updated conversation history.

    Returns a dict with:
    - assistant_message: The agent's response text
    - graph: the generated graph spec (None if the response was conversational)
    - conversation_history: Updated conversation history
    """
    response_text = call_claude(
        message,
        conversation_history,
        metric_types,
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
            "graph": parsed.graph.model_dump(),
            "conversation_history": new_history,
        }
    except (json.JSONDecodeError, Exception) as e:
        logger.info("Response was not a composite layer graph (might be conversational): %s", e)
        return {
            "assistant_message": response_text,
            "graph": None,
            "conversation_history": new_history,
        }
