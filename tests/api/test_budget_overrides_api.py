from rest_framework import status

from iaso.models import Account
from iaso.test import APITestCase
from plugins.snt_malaria.models import BudgetSettingsOverrides, Intervention, InterventionCategory, Scenario


BASE_URL = "/api/snt_malaria/budget_settings_overrides/"


class ScenarioAPITestCase(APITestCase):
    def setUp(cls):
        # Create a user and account for testing
        cls.account = Account.objects.create(name="Test Account")
        cls.user = cls.create_user_with_profile(username="testuser", account=cls.account)

        # Create a scenario
        cls.scenario = Scenario.objects.create(
            account=cls.account,
            created_by=cls.user,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2028,
        )

        # Create intervention categories
        cls.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=cls.account,
            created_by=cls.user,
        )

        cls.int_category_chemoprevention = InterventionCategory.objects.create(
            name="Preventive Chemotherapy",
            account=cls.account,
            created_by=cls.user,
        )

        # Create interventions
        cls.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=cls.user,
            intervention_category=cls.int_category_vaccination,
            code="rts_s",
        )
        cls.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
            code="smc",
        )
        cls.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
            code="iptp",
        )

        cls.client.force_authenticate(user=cls.user)

    def test_get_budget_overrides_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(f"{BASE_URL}?scenario_id={self.scenario.id}")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_budget_overrides_default_values(self):
        response = self.client.get(f"{BASE_URL}?scenario_id={self.scenario.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        self.assertEqual(
            response.data,
            [
                {
                    "id": None,
                    "intervention": 3,
                    "scenario": 1,
                    "coverage": 0.8,
                    "divisor": 0,
                    "bale_size": 0,
                    "buffer_mult": 1.1,
                    "doses_per_pw": 3,
                    "age_string": 0,
                    "pop_prop_3_11": 0,
                    "pop_prop_12_59": 0,
                    "monthly_rounds": 0,
                    "touchpoints": 0,
                    "tablet_factor": 0,
                    "doses_per_child": 0,
                },
                {
                    "id": None,
                    "intervention": 1,
                    "scenario": 1,
                    "coverage": 0,
                    "divisor": 0,
                    "bale_size": 0,
                    "buffer_mult": 0,
                    "doses_per_pw": 0,
                    "age_string": 0,
                    "pop_prop_3_11": 0,
                    "pop_prop_12_59": 0,
                    "monthly_rounds": 0,
                    "touchpoints": 0,
                    "tablet_factor": 0,
                    "doses_per_child": 0,
                },
                {
                    "id": None,
                    "intervention": 2,
                    "scenario": 1,
                    "coverage": 1.0,
                    "divisor": 0,
                    "bale_size": 0,
                    "buffer_mult": 1.1,
                    "doses_per_pw": 0,
                    "age_string": "0.18,0.77",
                    "pop_prop_3_11": 0.18,
                    "pop_prop_12_59": 0.77,
                    "monthly_rounds": 4,
                    "touchpoints": 0,
                    "tablet_factor": 0,
                    "doses_per_child": 0,
                },
            ],
        )

    def test_get_budget_overrides_with_existing(self):
        # First, create an override for one intervention
        override_data = {
            "intervention": self.intervention_vaccination_rts,
            "scenario": self.scenario,
            "coverage": 0.9,
            "divisor": 0,
            "bale_size": 0,
            "buffer_mult": 0,
            "doses_per_pw": 0,
            "age_string": 0,
            "pop_prop_3_11": 0,
            "pop_prop_12_59": 0,
            "monthly_rounds": 0,
            "touchpoints": 0,
            "tablet_factor": 0,
            "doses_per_child": 5,
        }

        BudgetSettingsOverrides.objects.create(**override_data)

        # Now, fetch the overrides via the API
        response = self.client.get(f"{BASE_URL}?scenario_id={self.scenario.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

        # Check that the override is reflected in the response
        for item in response.data:
            if item["intervention"] == self.intervention_vaccination_rts.id:
                self.assertEqual(item["coverage"], "0.90")
                self.assertEqual(item["doses_per_child"], 5)
            else:
                # Other interventions should have default values
                if item["intervention"] == self.intervention_chemo_smc.id:
                    self.assertEqual(item["coverage"], 1.0)
                elif item["intervention"] == self.intervention_chemo_iptp.id:
                    self.assertEqual(item["coverage"], 0.8)

    def test_post_budget_overrides_unauthenticated(self):
        self.client.force_authenticate(user=None)
        override_data = {
            "intervention": self.intervention_vaccination_rts.id,
            "scenario": self.scenario.id,
            "coverage": 0.9,
            "divisor": 0,
            "bale_size": 0,
            "buffer_mult": 0,
            "doses_per_pw": 0,
            "age_string": 0,
            "pop_prop_3_11": 0,
            "pop_prop_12_59": 0,
            "monthly_rounds": 0,
            "touchpoints": 0,
            "tablet_factor": 0,
            "doses_per_child": 5,
        }
        response = self.client.post(BASE_URL, override_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_budget_overrides_invalid_scenario(self):
        override_data = {
            "intervention": self.intervention_vaccination_rts.id,
            "scenario": 9999,
            "coverage": 0.9,
            "divisor": 0,
            "bale_size": 0,
            "buffer_mult": 0,
            "doses_per_pw": 0,
            "age_string": 0,
            "pop_prop_3_11": 0,
            "pop_prop_12_59": 0,
            "monthly_rounds": 0,
            "touchpoints": 0,
            "tablet_factor": 0,
            "doses_per_child": 5,
        }
        response = self.client.post(BASE_URL, override_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario", response.data)

    def test_post_budget_overrides_invalid_intervention(self):
        override_data = {
            "intervention": 9999,
            "scenario": self.scenario.id,
            "coverage": 0.9,
            "divisor": 0,
            "bale_size": 0,
            "buffer_mult": 0,
            "doses_per_pw": 0,
            "age_string": 0,
            "pop_prop_3_11": 0,
            "pop_prop_12_59": 0,
            "monthly_rounds": 0,
            "touchpoints": 0,
            "tablet_factor": 0,
            "doses_per_child": 5,
        }
        response = self.client.post(BASE_URL, override_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("intervention", response.data)

    def test_post_budget_overrides(self):
        # Create an override for one intervention
        override_data = {
            "intervention": self.intervention_vaccination_rts.id,
            "scenario": self.scenario.id,
            "coverage": 0.9,
            "divisor": 0,
            "bale_size": 0,
            "buffer_mult": 0,
            "doses_per_pw": 0,
            "age_string": 0,
            "pop_prop_3_11": 0,
            "pop_prop_12_59": 0,
            "monthly_rounds": 0,
            "touchpoints": 0,
            "tablet_factor": 0,
            "doses_per_child": 5,
        }

        response = self.client.post(BASE_URL, override_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertIsNotNone(response.data)
        self.assertIsNotNone(response.data["id"])
        self.assertEqual(response.data["coverage"], "0.90")
        self.assertEqual(response.data["doses_per_child"], 5)
