from rest_framework import status

from plugins.snt_malaria.tests.api.intervention_cost_breakdown_lines.common_base import (
    InterventionCostBreakdownLineBase,
)


class InterventionCostBreakdownLineFilterTests(InterventionCostBreakdownLineBase):
    def test_list_cost_breakdown_lines_with_year_filter(self):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.get(self.BASE_URL, {"year": 2025})
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        ids = [item["id"] for item in result]
        self.assertCountEqual(ids, [self.cost_line1.id, self.cost_line2.id])  # others are 2026

    def test_list_cost_breakdown_lines_with_intervention_filter(self):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.get(self.BASE_URL, {"intervention_id": self.intervention_chemo_smc.id})
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        ids = [item["id"] for item in result]
        self.assertCountEqual(
            ids, [self.cost_line2.id, self.cost_line3.id, self.cost_line4.id]
        )  # cost_line1 is for a different intervention

    def test_list_cost_breakdown_lines_with_year_and_intervention_filters(self):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.get(self.BASE_URL, {"year": 2025, "intervention_id": self.intervention_chemo_smc.id})
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        ids = [item["id"] for item in result]
        self.assertCountEqual(ids, [self.cost_line2.id])
