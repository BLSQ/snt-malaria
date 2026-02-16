from django.contrib.postgres.fields import ArrayField
from django.db import models

from iaso.utils.colors import DEFAULT_COLOR
from plugins.snt_malaria.models.scenario import Scenario


class ScenarioRule(models.Model):
    class Meta:
        app_label = "snt_malaria"

    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="scenario")
    priority = models.IntegerField()
    color = models.CharField(max_length=7, null=True, blank=True, default=DEFAULT_COLOR)

    # This should match format for jsonlogic_to_exists_q_clauses in iaso.utils.jsonlogic
    # This should only support one level.
    # {"and": [{"==": [{"var": "gender"}, "F"]}, {"<": [{"var": "age"}, 25]}]}
    # TODO: Make sure we validate the format
    matching_criteria = models.JSONField()
    # Those fields are mainly used to keep track on org units setup in the UI.
    # Foreign keys to org units and interventions are managed by intervention_assignments.
    org_units_matched = ArrayField(models.IntegerField(), blank=True, default=list)
    org_units_scope = ArrayField(models.IntegerField(), blank=True, default=list)
    org_units_excluded = ArrayField(models.IntegerField(), blank=True, default=list)
    org_units_included = ArrayField(models.IntegerField(), blank=True, default=list)
    interventions = ArrayField(models.IntegerField(), blank=True, default=list)
