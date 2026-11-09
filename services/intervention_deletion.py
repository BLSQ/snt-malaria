from typing import Optional

from django.contrib.auth.models import User
from django.db import transaction

from plugins.snt_malaria.models import Intervention, Scenario, ScenarioRuleIntervention


@transaction.atomic
def delete_intervention(
    intervention: Intervention,
    user: User,
    replace_with: Optional[Intervention] = None,
    remove_from_active_rules: bool = False,
) -> None:
    """Delete an intervention, dropping its links from soft-deleted scenarios.

    Links from active scenarios are moved to `replace_with` or removed with `remove_from_active_rules`;
    with neither, they make the delete raise ProtectedError and nothing is changed.
    """
    rule_interventions = ScenarioRuleIntervention.objects.filter(intervention=intervention)
    rule_interventions.in_deleted_scenarios().remove_from_rules()

    active_rule_interventions = rule_interventions.in_active_scenarios()
    if replace_with:
        affected_scenario_ids = active_rule_interventions.replace_in_rules(replace_with)
    elif remove_from_active_rules:
        affected_scenario_ids = active_rule_interventions.remove_from_rules()
    else:
        affected_scenario_ids = set()

    intervention.delete()

    for scenario in Scenario.objects.filter(id__in=affected_scenario_ids):
        scenario.refresh_assignments(user)
