from decimal import Decimal
from unittest import mock

from rest_framework import status

from iaso.models.metric import MetricType
from plugins.snt_malaria.models.cost_breakdown import InterventionCostBreakdownLine
from plugins.snt_malaria.tests.api.intervention_cost_breakdown_lines.common_base import (
    InterventionCostBreakdownLineBase,
)


RECALCULATE_PATH = "plugins.snt_malaria.api.intervention_cost_breakdown_line.views.recalculate_budgets_for_intervention"


class InterventionCostBreakdownLineAPITests(InterventionCostBreakdownLineBase):
    def test_put_is_not_allowed(self):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.put(f"{self.BASE_URL}{self.cost_line1.id}/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    @mock.patch(RECALCULATE_PATH)
    def test_create_cost_breakdown_line_returns_line_and_recalculates_budgets(self, recalculate):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.post(
            self.BASE_URL,
            {
                "intervention": self.intervention_chemo_iptp.id,
                "name": "New line",
                "unit_cost": "3.50",
                "category": "Procurement",
                "unit_type": self.unit_type_other.id,
                "coverage": "80",
            },
            format="json",
        )
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        line = InterventionCostBreakdownLine.objects.get(id=result["id"])
        self.assertEqual(line.created_by, self.user_write)
        self.assertEqual(line.coverage, Decimal("80"))
        self.assertEqual(result["unit_type_label"], self.unit_type_other.name)
        recalculate.assert_called_once_with(self.intervention_chemo_iptp, self.user_write)

    @mock.patch(RECALCULATE_PATH)
    def test_partial_update_cost_breakdown_line_keeps_unsent_fields(self, recalculate):
        population = MetricType.objects.create(account=self.account, name="Total population", code="POP")
        self.cost_line1.is_proportional = True
        self.cost_line1.population_layer = population
        self.cost_line1.save()

        self.client.force_authenticate(user=self.user_write)
        response = self.client.patch(f"{self.BASE_URL}{self.cost_line1.id}/", {"unit_cost": "12.00"}, format="json")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.cost_line1.refresh_from_db()
        self.assertEqual(self.cost_line1.unit_cost, Decimal("12.00"))
        self.assertTrue(self.cost_line1.is_proportional)
        self.assertEqual(self.cost_line1.population_layer, population)
        self.assertEqual(self.cost_line1.updated_by, self.user_write)
        self.assertEqual(result["population_layer_label"], "Total population")
        recalculate.assert_called_once_with(self.intervention_vaccination_rts, self.user_write)

    @mock.patch(RECALCULATE_PATH)
    def test_partial_update_can_clear_buffer_to_use_budget_settings(self, recalculate):
        self.cost_line1.buffer = Decimal("10")
        self.cost_line1.save()

        self.client.force_authenticate(user=self.user_write)
        response = self.client.patch(f"{self.BASE_URL}{self.cost_line1.id}/", {"buffer": None}, format="json")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.cost_line1.refresh_from_db()
        self.assertIsNone(self.cost_line1.buffer)
        self.assertIsNone(result["buffer"])

    @mock.patch(RECALCULATE_PATH)
    def test_partial_update_to_proportional_without_population_is_rejected(self, recalculate):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.patch(f"{self.BASE_URL}{self.cost_line1.id}/", {"is_proportional": True}, format="json")
        self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        recalculate.assert_not_called()

    @mock.patch(RECALCULATE_PATH)
    def test_delete_cost_breakdown_line_recalculates_budgets(self, recalculate):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.delete(f"{self.BASE_URL}{self.cost_line1.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(InterventionCostBreakdownLine.objects.filter(id=self.cost_line1.id).exists())
        recalculate.assert_called_once_with(self.intervention_vaccination_rts, self.user_write)

    @mock.patch(RECALCULATE_PATH)
    def test_partial_update_ignores_id_in_payload(self, recalculate):
        """A payload id must not redirect the update to another line, even one of another account."""
        self.client.force_authenticate(user=self.user_write)
        response = self.client.patch(
            f"{self.BASE_URL}{self.cost_line1.id}/",
            {"id": self.other_cost_line.id, "unit_cost": "99.00"},
            format="json",
        )
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertEqual(result["id"], self.cost_line1.id)
        self.cost_line1.refresh_from_db()
        self.other_cost_line.refresh_from_db()
        self.assertEqual(self.cost_line1.unit_cost, Decimal("99.00"))
        self.assertEqual(self.other_cost_line.unit_cost, Decimal("20.00"))
        self.assertEqual(self.other_cost_line.intervention, self.other_intervention)

    @mock.patch(RECALCULATE_PATH)
    def test_create_ignores_id_in_payload(self, recalculate):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.post(
            self.BASE_URL,
            {
                "id": self.cost_line1.id,
                "intervention": self.intervention_chemo_iptp.id,
                "name": "New line",
                "unit_cost": "1",
                "category": "Procurement",
                "unit_type": self.unit_type_other.id,
            },
            format="json",
        )
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        self.assertNotEqual(result["id"], self.cost_line1.id)
        self.cost_line1.refresh_from_db()
        self.assertEqual(self.cost_line1.name, "Cost Line 1")

    def test_write_cost_breakdown_line_with_read_perm_is_forbidden(self):
        self.client.force_authenticate(user=self.user_read)
        url = f"{self.BASE_URL}{self.cost_line1.id}/"
        self.assertEqual(self.client.patch(url, {"unit_cost": "1"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(url).status_code, 403)
        self.assertEqual(self.client.post(self.BASE_URL, {}, format="json").status_code, 403)

    def test_write_cost_breakdown_line_of_other_account_is_not_found(self):
        self.client.force_authenticate(user=self.user_write)
        url = f"{self.BASE_URL}{self.other_cost_line.id}/"
        self.assertEqual(self.client.patch(url, {"unit_cost": "1"}, format="json").status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)

    def test_create_cost_breakdown_line_for_other_account_intervention_is_rejected(self):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.post(
            self.BASE_URL,
            {
                "intervention": self.other_intervention.id,
                "name": "New line",
                "unit_cost": "1",
                "category": "Procurement",
                "unit_type": self.unit_type_other.id,
            },
            format="json",
        )
        self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)

    def test_list_cost_breakdown_lines_with_write_perm(self):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)
        ids = [item["id"] for item in result]
        self.assertCountEqual(ids, [self.cost_line1.id, self.cost_line2.id])

    def test_list_cost_breakdown_lines_includes_population_layer_label(self):
        population = MetricType.objects.create(account=self.account, name="Total population", code="POP")
        self.cost_line1.is_proportional = True
        self.cost_line1.population_layer = population
        self.cost_line1.save()

        self.client.force_authenticate(user=self.user_read)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        labels = {item["id"]: item["population_layer_label"] for item in result}
        self.assertEqual(labels[self.cost_line1.id], "Total population")
        self.assertIsNone(labels[self.cost_line2.id])

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
            },
            {
                "value": str(self.unit_type_per_sp.id),
                "label": self.unit_type_per_sp.name,
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
            },
            {
                "value": str(self.unit_type_per_sp.id),
                "label": self.unit_type_per_sp.name,
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
