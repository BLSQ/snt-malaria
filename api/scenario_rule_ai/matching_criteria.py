from typing import Optional


# Mirrors the frontend's flat MetricTypeCriterion shape (js/src/domains/planning/types/scenarioRule.ts)
# and its conversion helpers (js/src/domains/planning/utils/jsonLogic.tsx), so the AI-facing rule
# spec never has to deal with jsonlogic directly - only ScenarioRule.matching_criteria itself does.


def is_match_all(matching_criteria) -> bool:
    return isinstance(matching_criteria, dict) and matching_criteria.get("all") is True


def jsonlogic_to_matching_criteria(matching_criteria) -> list[dict]:
    """{"and": [{"==": [{"var": 1}, 10]}, ...]} -> [{"metric_type": 1, "operator": "==", "value": 10}, ...]"""
    if not isinstance(matching_criteria, dict):
        return []

    and_logic = matching_criteria.get("and")
    if not isinstance(and_logic, list):
        return []

    criteria = []
    for condition in and_logic:
        operator = next(iter(condition))
        var_obj, value = condition[operator]
        metric_type = var_obj["var"]
        if isinstance(value, str):
            criteria.append({"metric_type": metric_type, "operator": operator, "string_value": value})
        else:
            criteria.append({"metric_type": metric_type, "operator": operator, "value": value})
    return criteria


def matching_criteria_to_jsonlogic(criteria: list[dict]) -> Optional[dict]:
    """The inverse of `jsonlogic_to_matching_criteria`. Returns None when nothing valid to submit."""
    and_rules = []
    for criterion in criteria:
        string_value = criterion.get("string_value")
        value = string_value if string_value else criterion.get("value")
        if value is None:
            continue
        and_rules.append({criterion["operator"]: [{"var": criterion["metric_type"]}, value]})

    if not and_rules:
        return None

    return {"and": and_rules}
