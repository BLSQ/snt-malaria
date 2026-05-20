from rest_framework import status

from plugins.snt_malaria.models.cost_breakdown import InterventionCostBreakdownLine
from plugins.snt_malaria.tests.api.intervention_cost_breakdown_lines.common_base import (
    InterventionCostBreakdownLineBase,
)


class InterventionCostBreakdownLineAPITests(InterventionCostBreakdownLineBase):
    def test_list_cost_breakdown_lines_with_write_perm(self):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)
        ids = [item["id"] for item in result]
        self.assertCountEqual(ids, [self.cost_line1.id, self.cost_line2.id])

    def test_list_cost_breakdown_lines_with_read_perm(self):
        self.client.force_authenticate(user=self.user_read)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)
        ids = [item["id"] for item in result]
        self.assertCountEqual(ids, [self.cost_line1.id, self.cost_line2.id])

    def test_list_cost_breakdown_lines_with_no_perm(self):
        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_cost_breakdown_lines_unauthenticated(self):
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_cost_breakdown_line_with_write_perm(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [
                {
                    "unit_cost": 15,
                    "unit_type": self.unit_type_other.id,
                    "name": "Cost Line X",
                    "category": "Procurement",
                }
            ],
        }

        self.client.force_authenticate(user=self.user_write)
        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 3)  # from setup

    def test_create_cost_breakdown_line_with_read_perm(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [
                {
                    "unit_cost": 15,
                    "unit_type": self.unit_type_other.id,
                    "name": "Cost Line X",
                    "category": "Procurement",
                }
            ],
        }

        self.client.force_authenticate(user=self.user_read)
        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 3)  # from setup

    def test_create_cost_breakdown_line_with_no_perm(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [
                {
                    "unit_cost": 15,
                    "unit_type": self.unit_type_other.id,
                    "name": "Cost Line X",
                    "category": "Procurement",
                }
            ],
        }

        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 3)  # from setup

    def test_create_cost_breakdown_line_unauthenticated(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [
                {
                    "unit_cost": 15,
                    "unit_type": self.unit_type_other.id,
                    "name": "Cost Line X",
                    "category": "Procurement",
                }
            ],
        }

        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 3)

    def test_create_breakdown_line_with_intervention_from_other_account(self):
        data = {
            "intervention": self.other_intervention.id,
            "costs": [
                {
                    "unit_cost": 20,
                    "unit_type": self.unit_type_other.id,
                    "name": "Cost Line Y",
                    "category": "Supportive",
                }
            ],
        }

        self.client.force_authenticate(user=self.user_write)
        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 3)  # from setup

    def test_create_breakdown_line_erase_old_costs(self):
        # Endpoint is read-only: POST should be rejected and existing costs should remain unchanged.
        data = {
            "intervention": self.intervention_chemo_smc.id,
            "costs": [
                {
                    "unit_cost": 12,
                    "unit_type": self.unit_type_other.id,
                    "name": "Cost Line Z",
                    "category": "Operational",
                }
            ],
        }

        self.client.force_authenticate(user=self.user_write)
        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        costs = InterventionCostBreakdownLine.objects.filter(intervention=self.intervention_chemo_smc)
        self.assertEqual(costs.count(), 1)
        cost = costs.first()
        self.assertEqual(cost.id, self.cost_line2.id)
        self.assertEqual(cost.unit_cost, self.cost_line2.unit_cost)
        self.assertEqual(cost.unit_type_id, self.cost_line2.unit_type_id)
        self.assertEqual(cost.name, self.cost_line2.name)
        self.assertEqual(cost.category, self.cost_line2.category)

    def test_get_cost_breakdown_line_categories_with_write_perm(self):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.get(f"{self.BASE_URL}categories/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        expected_categories = [
            {"value": choice[0], "label": choice[1]}
            for choice in InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.choices
        ]
        self.assertCountEqual(result, expected_categories)

    def test_get_cost_breakdown_line_categories_with_read_perm(self):
        self.client.force_authenticate(user=self.user_read)
        response = self.client.get(f"{self.BASE_URL}categories/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        expected_categories = [
            {"value": choice[0], "label": choice[1]}
            for choice in InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.choices
        ]
        self.assertCountEqual(result, expected_categories)

    def test_get_cost_breakdown_line_categories_with_no_perm(self):
        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.get(f"{self.BASE_URL}categories/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        expected_categories = [
            {"value": choice[0], "label": choice[1]}
            for choice in InterventionCostBreakdownLine.InterventionCostBreakdownLineCategory.choices
        ]
        self.assertCountEqual(result, expected_categories)

    def test_get_cost_breakdown_line_categories_unauthenticated(self):
        response = self.client.get(f"{self.BASE_URL}categories/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_cost_breakdown_line_unit_types_with_write_perm(self):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.get(f"{self.BASE_URL}unit_types_dropdown/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        expected_unit_types = [
            {"value": str(self.unit_type_other.id), "label": self.unit_type_other.name},
            {"value": str(self.unit_type_per_sp.id), "label": self.unit_type_per_sp.name},
        ]
        self.assertCountEqual(result, expected_unit_types)

    def test_get_cost_breakdown_line_unit_types_with_read_perm(self):
        self.client.force_authenticate(user=self.user_read)
        response = self.client.get(f"{self.BASE_URL}unit_types_dropdown/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        expected_unit_types = [
            {"value": str(self.unit_type_other.id), "label": self.unit_type_other.name},
            {"value": str(self.unit_type_per_sp.id), "label": self.unit_type_per_sp.name},
        ]
        self.assertCountEqual(result, expected_unit_types)

    def test_get_cost_breakdown_line_unit_types_with_no_perm(self):
        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.get(f"{self.BASE_URL}unit_types_dropdown/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_cost_breakdown_line_unit_types_unauthenticated(self):
        response = self.client.get(f"{self.BASE_URL}unit_types_dropdown/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
