from rest_framework import status

from plugins.snt_malaria.api.interventions.permissions import (
    SNT_SETTINGS_READ_PERMISSION,
    SNT_SETTINGS_WRITE_PERMISSION,
)
from plugins.snt_malaria.models import Budget, Donor, Grant
from plugins.snt_malaria.models.cost_unit_type import CostUnitType
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


BASE_URL = "/api/snt_malaria/interventions/"


class InterventionAPITests(SNTMalariaAPITestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, _ = self.create_snt_account(name="Test Account 3")
        self.user_write, self.anon, self.user_no_perm = self.create_base_users(
            self.account, [SNT_SETTINGS_WRITE_PERMISSION], "admin"
        )
        self.user_read = self.create_user_with_profile(
            username="user_read", account=self.account, permissions=[SNT_SETTINGS_READ_PERMISSION]
        )

        defaults = self.create_snt_default_interventions(account=self.account, created_by=self.user_write)
        self.int_category_vaccination = defaults["category_vaccination"]
        self.int_category_chemoprevention = defaults["category_chemoprevention"]
        self.intervention_vaccination_rts = defaults["intervention_rts"]
        self.intervention_chemo_smc = defaults["intervention_smc"]
        self.intervention_chemo_iptp = defaults["intervention_iptp"]
        self.unit_type_other, _ = CostUnitType.objects.get_or_create(account=self.account, name="Other")
        self.unit_type_per_itn, _ = CostUnitType.objects.get_or_create(account=self.account, name="per ITN")

        self.cost_line = self.intervention_vaccination_rts.cost_breakdown_lines.create(
            name="Cost Line 1",
            unit_cost=10,
            category="Procurement",
            unit_type=self.unit_type_other,
            created_by=self.user_write,
        )

    def test_list_interventions_authenticated(self):
        self.client.force_authenticate(user=self.user_write)
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)
        rts_intervention = next(
            (item for item in response.data if item["id"] == self.intervention_vaccination_rts.id), None
        )
        self.assertIsNotNone(rts_intervention)

    def test_list_interventions_insufficient_permissions(self):
        self.client.force_authenticate(user=self.user_no_perm)
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_interventions_read_permission(self):
        self.client.force_authenticate(user=self.user_read)
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)
        rts_intervention = next(
            (item for item in response.data if item["id"] == self.intervention_vaccination_rts.id), None
        )
        self.assertIsNotNone(rts_intervention)

    def test_list_intervention_unauthenticated(self):
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_intervention_details(self):
        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/details/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.intervention_vaccination_rts.id)
        self.assertEqual(response.data["name"], self.intervention_vaccination_rts.name)
        self.assertEqual(response.data["impact_ref"], self.intervention_vaccination_rts.impact_ref)
        self.assertIn("cost_breakdown_lines", response.data)

    def test_retrieve_intervention_details_unauthenticated(self):
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/details/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_intervention_details_insufficient_permissions(self):
        self.client.force_authenticate(user=self.user_no_perm)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/details/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_retrieve_intervention_details_read_permission(self):
        self.client.force_authenticate(user=self.user_read)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/details/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.intervention_vaccination_rts.id)
        self.assertEqual(response.data["name"], self.intervention_vaccination_rts.name)
        self.assertEqual(response.data["impact_ref"], self.intervention_vaccination_rts.impact_ref)
        self.assertIn("cost_breakdown_lines", response.data)

    def test_update_intervention_details(self):
        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        data = {
            "name": "Updated RTS,S",
            "impact_ref": "updated_ref",
            "cost_breakdown_lines": [
                {
                    "name": "Updated Cost Line 1",
                    "unit_cost": 15,
                    "unit_type": self.unit_type_other.id,
                    "category": "Procurement",
                },
                {
                    "name": "New Cost Line 2",
                    "unit_cost": 20,
                    "unit_type": self.unit_type_per_itn.id,
                    "category": "Distribution",
                },
            ],
        }
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.intervention_vaccination_rts.refresh_from_db()
        self.assertEqual(self.intervention_vaccination_rts.name, data["name"])
        self.assertEqual(self.intervention_vaccination_rts.impact_ref, data["impact_ref"])
        self.assertEqual(self.intervention_vaccination_rts.cost_breakdown_lines.count(), 2)
        line_names = [line.name for line in self.intervention_vaccination_rts.cost_breakdown_lines.all()]
        self.assertIn("Updated Cost Line 1", line_names)
        self.assertIn("New Cost Line 2", line_names)

    def test_retrieve_intervention_details_includes_grant(self):
        donor = Donor.objects.create(account=self.account, name="Global Fund")
        grant = Grant.objects.create(account=self.account, donor=donor, name="NFM4")
        self.intervention_vaccination_rts.grant = grant
        self.intervention_vaccination_rts.save()

        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/details/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["grant"], grant.id)

    def test_update_intervention_details_set_grant(self):
        donor = Donor.objects.create(account=self.account, name="Global Fund")
        grant = Grant.objects.create(account=self.account, donor=donor, name="NFM4")

        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        response = self.client.put(url, {"grant": grant.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["grant"], grant.id)
        self.intervention_vaccination_rts.refresh_from_db()
        self.assertEqual(self.intervention_vaccination_rts.grant, grant)

    def test_update_intervention_details_clear_grant(self):
        donor = Donor.objects.create(account=self.account, name="Global Fund")
        grant = Grant.objects.create(account=self.account, donor=donor, name="NFM4")
        self.intervention_vaccination_rts.grant = grant
        self.intervention_vaccination_rts.save()

        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        response = self.client.put(url, {"grant": None}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["grant"])
        self.intervention_vaccination_rts.refresh_from_db()
        self.assertIsNone(self.intervention_vaccination_rts.grant)

    def test_update_intervention_details_with_other_account_grant_returns_400(self):
        other_account, _ = self.create_snt_account(name="Other Account For Grants")
        other_donor = Donor.objects.create(account=other_account, name="Other Donor")
        other_grant = Grant.objects.create(account=other_account, donor=other_donor, name="Other Grant")

        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        response = self.client.put(url, {"grant": other_grant.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.intervention_vaccination_rts.refresh_from_db()
        self.assertIsNone(self.intervention_vaccination_rts.grant)

    def test_update_intervention_details_recalculates_budget_per_assigned_scenario(self):
        scenario_with_assignment = self.create_snt_scenario(
            account=self.account,
            created_by=self.user_write,
            name="Scenario with assignment",
        )
        scenario_without_assignment = self.create_snt_scenario(
            account=self.account,
            created_by=self.user_write,
            name="Scenario without assignment",
        )
        org_unit = self.create_snt_org_unit(name="District for budget update")

        self.create_snt_assignment(
            scenario=scenario_with_assignment,
            org_unit=org_unit,
            intervention=self.intervention_vaccination_rts,
            created_by=self.user_write,
        )
        self.create_snt_assignment(
            scenario=scenario_without_assignment,
            org_unit=org_unit,
            intervention=self.intervention_chemo_smc,
            created_by=self.user_write,
        )

        self.assertEqual(Budget.objects.filter(scenario=scenario_with_assignment).count(), 0)
        self.assertEqual(Budget.objects.filter(scenario=scenario_without_assignment).count(), 0)

        self.client.force_authenticate(user=self.user_write)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        response = self.client.put(url, {"name": "Updated RTS,S"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Budget.objects.filter(scenario=scenario_with_assignment).count(), 1)
        self.assertEqual(Budget.objects.filter(scenario=scenario_without_assignment).count(), 0)

    def test_update_intervention_details_unauthenticated(self):
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        data = {
            "name": "Updated RTS,S",
            "impact_ref": "updated_ref",
            "cost_breakdown_lines": [
                {
                    "name": "Updated Cost Line 1",
                    "unit_cost": 15,
                    "unit_type": self.unit_type_other.id,
                    "category": "Procurement",
                },
                {
                    "name": "New Cost Line 2",
                    "unit_cost": 20,
                    "unit_type": self.unit_type_per_itn.id,
                    "category": "Distribution",
                },
            ],
        }
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_intervention_details_insufficient_permissions(self):
        self.client.force_authenticate(user=self.user_read)
        url = f"{BASE_URL}{self.intervention_vaccination_rts.id}/update_details/"
        data = {
            "name": "Updated RTS,S",
            "impact_ref": "updated_ref",
            "cost_breakdown_lines": [
                {
                    "name": "Updated Cost Line 1",
                    "unit_cost": 15,
                    "unit_type": self.unit_type_other.id,
                    "category": "Procurement",
                },
                {
                    "name": "New Cost Line 2",
                    "unit_cost": 20,
                    "unit_type": self.unit_type_per_itn.id,
                    "category": "Distribution",
                },
            ],
        }
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
