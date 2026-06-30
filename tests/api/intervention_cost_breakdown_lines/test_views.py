from rest_framework import status

from plugins.snt_malaria.models.cost_breakdown import InterventionCostBreakdownLine
from plugins.snt_malaria.tests.api.intervention_cost_breakdown_lines.common_base import (
    InterventionCostBreakdownLineBase,
)


class InterventionCostBreakdownLineAPITests(InterventionCostBreakdownLineBase):
    def test_write_methods_are_not_allowed(self):
        self.client.force_authenticate(user=self.user_write)
        for method in ("post", "put", "patch", "delete"):
            response = getattr(self.client, method)(self.BASE_URL, {}, format="json")
            self.assertEqual(
                response.status_code,
                status.HTTP_405_METHOD_NOT_ALLOWED,
                f"{method.upper()} should be rejected, got {response.status_code}",
            )
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 3)

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

    def test_create_cost_breakdown_line_with_read_perm(self):
        self.client.force_authenticate(user=self.user_read)
        response = self.client.post(self.BASE_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 3)  # from setup

    def test_create_cost_breakdown_line_with_no_perm(self):
        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.post(self.BASE_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 3)  # from setup

    def test_create_cost_breakdown_line_unauthenticated(self):
        response = self.client.post(self.BASE_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(InterventionCostBreakdownLine.objects.count(), 3)

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
            {
                "value": str(self.unit_type_other.id),
                "label": self.unit_type_other.name,
                "is_proportional": self.unit_type_other.is_proportional,
            },
            {
                "value": str(self.unit_type_per_sp.id),
                "label": self.unit_type_per_sp.name,
                "is_proportional": self.unit_type_per_sp.is_proportional,
            },
        ]
        self.assertCountEqual(result, expected_unit_types)

    def test_get_cost_breakdown_line_unit_types_with_read_perm(self):
        self.client.force_authenticate(user=self.user_read)
        response = self.client.get(f"{self.BASE_URL}unit_types_dropdown/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        expected_unit_types = [
            {
                "value": str(self.unit_type_other.id),
                "label": self.unit_type_other.name,
                "is_proportional": self.unit_type_other.is_proportional,
            },
            {
                "value": str(self.unit_type_per_sp.id),
                "label": self.unit_type_per_sp.name,
                "is_proportional": self.unit_type_per_sp.is_proportional,
            },
        ]
        self.assertCountEqual(result, expected_unit_types)

    def test_get_cost_breakdown_line_unit_types_with_no_perm(self):
        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.get(f"{self.BASE_URL}unit_types_dropdown/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_cost_breakdown_line_unit_types_unauthenticated(self):
        response = self.client.get(f"{self.BASE_URL}unit_types_dropdown/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
