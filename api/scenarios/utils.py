from collections import defaultdict
from copy import deepcopy
from datetime import datetime
from decimal import Decimal

import pandas as pd

from django.contrib.auth.models import User

from iaso.utils.colors import COLOR_CHOICES, DISPERSED_COLOR_ORDER
from plugins.snt_malaria.models.intervention import Intervention, InterventionAssignment
from plugins.snt_malaria.models.scenario import Scenario, ScenarioRule, ScenarioRuleInterventionProperties


def get_intervention_column(name, code):
    return f"{name} - {code}"


def get_scenario(user, base_name="Scenario"):
    return Scenario(
        name=f"{base_name} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        created_by=user,
        account=user.iaso_profile.account,
        start_year=datetime.now().year,
        end_year=datetime.now().year + 3,
    )


def get_interventions(account):
    return Intervention.objects.filter(intervention_category__account=account).values("id", "name", "code")


def get_csv_headers(interventions):
    csv_header_columns = ["org_unit_id", "org_unit_name"]
    intervention_names = interventions.values_list("name", "code").order_by("name")
    csv_header_columns.extend([get_intervention_column(name, code) for name, code in intervention_names])
    return csv_header_columns


def get_missing_headers(df, interventions):
    file_headers = df.columns.tolist()
    csv_headers = get_csv_headers(interventions)
    return [header for header in csv_headers if header not in file_headers]


def get_csv_row(org_unit_id, org_unit_name, org_unit_interventions, interventions):
    row = [org_unit_id, org_unit_name]
    for intervention in interventions:
        if any(assignment.intervention.id == intervention.id for assignment in org_unit_interventions):
            row.append(1)
        else:
            row.append(0)

    return row


def get_assignments_from_row(user, scenario, row, interventions):
    assignments = []
    for intervention in interventions:
        intervention_name = get_intervention_column(intervention["name"], intervention["code"])

        assigned_value = row[intervention_name]
        if assigned_value == 1:
            print(
                f"creating intervention with name {intervention_name} and id {intervention['id']} and for OU {row['org_unit_id']}"
            )
            assignment = InterventionAssignment(
                scenario=scenario,
                org_unit_id=row["org_unit_id"],
                intervention_id=intervention["id"],
                created_by=user,
            )
            assignments.append(assignment)
    return assignments


RULE_NAME_MAX_LENGTH = 255
DEFAULT_IMPORT_COVERAGE = Decimal("1.00")


def _get_dispersed_color(index: int) -> str:
    """Return a color from COLOR_CHOICES using the dispersed ordering for visual distinctness."""
    palette_index = DISPERSED_COLOR_ORDER[index % len(DISPERSED_COLOR_ORDER)]
    return COLOR_CHOICES[palette_index][0]


def _build_rule_name(interventions: list[Intervention]) -> str:
    """Build a rule name from intervention short names joined by ' + ', truncated if needed."""
    parts = [i.short_name or i.name for i in sorted(interventions, key=lambda i: i.name)]
    name = " + ".join(parts)
    if len(name) > RULE_NAME_MAX_LENGTH:
        suffix = "…"
        name = name[: RULE_NAME_MAX_LENGTH - len(suffix)] + suffix
    return name


def _build_intervention_groups(
    assignment_df: pd.DataFrame,
    interventions_qs,
) -> list[dict]:
    """
    Group org units by their intervention combination.

    Returns a list of dicts:
        {
            "intervention_ids": frozenset of intervention ids,
            "org_unit_ids": list of org unit ids,
        }
    """
    intervention_lookup = {}
    for iv in interventions_qs:
        col_name = get_intervention_column(iv["name"], iv["code"])
        intervention_lookup[col_name] = iv["id"]

    ou_interventions: dict[int, set[int]] = defaultdict(set)
    for _, row in assignment_df.iterrows():
        ou_id = int(row["org_unit_id"])
        for col_name, iv_id in intervention_lookup.items():
            if row.get(col_name) == 1:
                ou_interventions[ou_id].add(iv_id)

    groups_map: dict[frozenset[int], list[int]] = defaultdict(list)
    for ou_id, iv_ids in ou_interventions.items():
        if iv_ids:
            groups_map[frozenset(iv_ids)].append(ou_id)

    return [{"intervention_ids": iv_ids, "org_unit_ids": sorted(ou_ids)} for iv_ids, ou_ids in groups_map.items()]


def create_rules_from_import(
    scenario: Scenario,
    assignment_df: pd.DataFrame,
    interventions_qs,
    all_org_unit_ids: set[int],
    user: User,
) -> list[ScenarioRule]:
    """
    Create ScenarioRules for an imported scenario based on intervention groups.

    For each distinct combination of interventions:
    - If the group covers >50% of org units ("majority"): create a "Match all" rule
      with org_units_excluded set to the org units NOT in the group.
    - Otherwise ("minority"): create an inclusion-only rule with
      org_units_included set to the group's org units.
    """
    groups = _build_intervention_groups(assignment_df, interventions_qs)
    if not groups:
        return []

    total_count = len(all_org_unit_ids)
    intervention_objects = {
        iv.id: iv
        for iv in Intervention.objects.filter(id__in={iv_id for g in groups for iv_id in g["intervention_ids"]})
    }

    rules = []
    intervention_properties = []

    for idx, group in enumerate(groups):
        ivs = [intervention_objects[iv_id] for iv_id in group["intervention_ids"]]
        name = _build_rule_name(ivs)
        color = _get_dispersed_color(idx)
        is_majority = len(group["org_unit_ids"]) > total_count / 2

        if is_majority:
            excluded = sorted(all_org_unit_ids - set(group["org_unit_ids"]))
            rule = ScenarioRule(
                scenario=scenario,
                name=name,
                priority=idx + 1,
                color=color,
                matching_criteria={"all": True},
                org_units_matched=[],
                org_units_excluded=excluded,
                org_units_included=[],
                org_units_scope=[],
                created_by=user,
            )
        else:
            rule = ScenarioRule(
                scenario=scenario,
                name=name,
                priority=idx + 1,
                color=color,
                matching_criteria=None,
                org_units_matched=[],
                org_units_excluded=[],
                org_units_included=group["org_unit_ids"],
                org_units_scope=[],
                created_by=user,
            )

        rules.append(rule)

    ScenarioRule.objects.bulk_create(rules)

    for rule, group in zip(rules, groups):
        for iv_id in group["intervention_ids"]:
            intervention_properties.append(
                ScenarioRuleInterventionProperties(
                    scenario_rule=rule,
                    intervention_id=iv_id,
                    coverage=DEFAULT_IMPORT_COVERAGE,
                )
            )

    ScenarioRuleInterventionProperties.objects.bulk_create(intervention_properties)

    return rules


def duplicate_rules(scenario_from: Scenario, scenario_to: Scenario, user: User):
    for rule in scenario_from.rules.all():
        initial_rule = deepcopy(rule)
        rule.pk = None
        rule.scenario = scenario_to
        rule.created_by = user
        rule.updated_by = None
        rule.save()

        for ip in initial_rule.intervention_properties.all():
            ip.pk = None
            ip.scenario_rule = rule
            ip.save()
