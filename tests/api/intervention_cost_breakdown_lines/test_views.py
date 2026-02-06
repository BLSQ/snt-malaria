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
        self.assertEqual(len(result), 4)
        ids = [item["id"] for item in result]
        self.assertCountEqual(ids, [self.cost_line1.id, self.cost_line2.id, self.cost_line3.id, self.cost_line4.id])

    def test_list_cost_breakdown_lines_with_read_perm(self):
        self.client.force_authenticate(user=self.user_read)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 4)
        ids = [item["id"] for item in result]
        self.assertCountEqual(ids, [self.cost_line1.id, self.cost_line2.id, self.cost_line3.id, self.cost_line4.id])

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
            "year": 2025,
            "costs": [
                {
                    "unit_cost": 15,
                    "unit_type": "OTHER",
                    "name": "Cost Line X",
                    "category": "Procurement",
                }
            ],
        }

        self.client.force_authenticate(user=self.user_write)
        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 6)  # 5 existing + 1 new

        icbl = InterventionCostBreakdownLine.objects.order_by("id").last()
        self.assertEqual(icbl.unit_cost, 15)
        self.assertEqual(icbl.unit_type, "OTHER")
        self.assertEqual(icbl.name, "Cost Line X")
        self.assertEqual(icbl.category, "Procurement")
        self.assertEqual(icbl.intervention.id, self.intervention_chemo_iptp.id)
        self.assertEqual(icbl.year, 2025)

    def test_create_cost_breakdown_line_with_read_perm(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "year": 2025,
            "costs": [
                {
                    "unit_cost": 15,
                    "unit_type": "OTHER",
                    "name": "Cost Line X",
                    "category": "Procurement",
                }
            ],
        }

        self.client.force_authenticate(user=self.user_read)
        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 5)  # from setup

    def test_create_cost_breakdown_line_with_no_perm(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "year": 2025,
            "costs": [
                {
                    "unit_cost": 15,
                    "unit_type": "OTHER",
                    "name": "Cost Line X",
                    "category": "Procurement",
                }
            ],
        }

        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 5)

    def test_create_cost_breakdown_line_unauthenticated(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "year": 2025,
            "costs": [
                {
                    "unit_cost": 15,
                    "unit_type": "OTHER",
                    "name": "Cost Line X",
                    "category": "Procurement",
                }
            ],
        }

        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 5)

    def test_create_breakdown_line_with_intervention_from_other_account(self):
        data = {
            "intervention": self.other_intervention.id,
            "year": 2025,
            "costs": [
                {
                    "unit_cost": 20,
                    "unit_type": "OTHER",
                    "name": "Cost Line Y",
                    "category": "Supportive",
                }
            ],
        }

        self.client.force_authenticate(user=self.user_write)
        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 5)  # from setup
        self.assertIn("intervention", response.data)
        self.assertIn(str(self.other_intervention.id), str(response.data["intervention"][0]))
