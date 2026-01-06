from typing import OrderedDict

from rest_framework import status

from iaso.models import Account
from iaso.test import APITestCase
from plugins.snt_malaria.models import BudgetAssumptions, Intervention, InterventionCategory, Scenario


BASE_URL = "/api/snt_malaria/budget_assumptions/"


class BudgetAssumptionsAPITestCase(APITestCase):
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

    def test_get_budget_assumptions_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(f"{BASE_URL}?scenario={self.scenario.id}")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_budget_assumptions_default_values(self):
        response = self.client.get(f"{BASE_URL}?scenario={self.scenario.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        self.assertEqual(
            response.data,
            [
                OrderedDict(
                    [
                        ("id", None),
                        ("scenario", 1),
                        ("intervention_code", "iptp"),
                        ("coverage", "0.80"),
                        ("divisor", "0.00"),
                        ("bale_size", 0),
                        ("buffer_mult", "1.10"),
                        ("doses_per_pw", 3),
                        ("age_string", "0"),
                        ("pop_prop_3_11", "0.00"),
                        ("pop_prop_12_59", "0.00"),
                        ("monthly_rounds", 0),
                        ("touchpoints", 0),
                        ("tablet_factor", "0.00"),
                        ("doses_per_child", 0),
                    ]
                ),
                OrderedDict(
                    [
                        ("id", None),
                        ("scenario", 1),
                        ("intervention_code", "rts_s"),
                        ("coverage", "0.00"),
                        ("divisor", "0.00"),
                        ("bale_size", 0),
                        ("buffer_mult", "0.00"),
                        ("doses_per_pw", 0),
                        ("age_string", "0"),
                        ("pop_prop_3_11", "0.00"),
                        ("pop_prop_12_59", "0.00"),
                        ("monthly_rounds", 0),
                        ("touchpoints", 0),
                        ("tablet_factor", "0.00"),
                        ("doses_per_child", 0),
                    ]
                ),
                OrderedDict(
                    [
                        ("id", None),
                        ("scenario", 1),
                        ("intervention_code", "smc"),
                        ("coverage", "1.00"),
                        ("divisor", "0.00"),
                        ("bale_size", 0),
                        ("buffer_mult", "1.10"),
                        ("doses_per_pw", 0),
                        ("age_string", "0.18,0.77"),
                        ("pop_prop_3_11", "0.18"),
                        ("pop_prop_12_59", "0.77"),
                        ("monthly_rounds", 4),
                        ("touchpoints", 0),
                        ("tablet_factor", "0.00"),
                        ("doses_per_child", 0),
                    ]
                ),
            ],
        )

    def test_get_budget_assumptions_with_existing(self):
        # First, create an override for one intervention
        override_data = {
            "intervention_code": self.intervention_vaccination_rts.code,
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

        BudgetAssumptions.objects.create(**override_data)

        # Now, fetch the assumptions via the API
        response = self.client.get(f"{BASE_URL}?scenario={self.scenario.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

        # Check that the override is reflected in the response
        for item in response.data:
            if item["intervention_code"] == self.intervention_vaccination_rts.code:
                self.assertEqual(item["coverage"], "0.90")
                self.assertEqual(item["doses_per_child"], 5)
            else:
                # Other interventions should have default values
                if item["intervention_code"] == self.intervention_chemo_smc.code:
                    self.assertEqual(item["coverage"], "1.00")
                elif item["intervention_code"] == self.intervention_chemo_iptp.code:
                    self.assertEqual(item["coverage"], "0.80")

    def test_post_budget_assumptions_unauthenticated(self):
        self.client.force_authenticate(user=None)
        override_data = {
            "intervention_code": self.intervention_vaccination_rts.code,
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

    def test_post_budget_assumptions_invalid_scenario(self):
        override_data = {
            "intervention_code": self.intervention_vaccination_rts.code,
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

    def test_post_budget_assumptions(self):
        # Create an override for one intervention
        override_data = {
            "intervention_code": self.intervention_vaccination_rts.code,
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

    def test_put_budget_assumptions_unauthenticated(self):
        # First, create an assumption for one intervention
        assumption = BudgetAssumptions.objects.create(
            intervention_code=self.intervention_vaccination_rts.code,
            scenario=self.scenario,
            coverage=0.9,
            divisor=0,
            bale_size=0,
            buffer_mult=0,
            doses_per_pw=0,
            age_string=0,
            pop_prop_3_11=0,
            pop_prop_12_59=0,
            monthly_rounds=0,
            touchpoints=0,
            tablet_factor=0,
            doses_per_child=5,
        )

        self.client.force_authenticate(user=None)
        updated_data = {
            "id": assumption.id,
            "intervention_code": self.intervention_vaccination_rts.code,
            "scenario": self.scenario.id,
            "coverage": 0.95,
            "divisor": 1,
            "bale_size": 10,
            "buffer_mult": 1.2,
            "doses_per_pw": 2,
            "age_string": "1-5",
            "pop_prop_3_11": 0.1,
            "pop_prop_12_59": 0.5,
            "monthly_rounds": 3,
            "touchpoints": 2.5,
            "tablet_factor": 1,
            "doses_per_child": 6,
        }
        response = self.client.put(f"{BASE_URL}{assumption.id}/", updated_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_put_budget_assumptions(self):
        # First, create an assumption for one intervention
        assumption = BudgetAssumptions.objects.create(
            intervention_code=self.intervention_vaccination_rts.code,
            scenario=self.scenario,
            coverage=0.9,
            divisor=0,
            bale_size=0,
            buffer_mult=0,
            doses_per_pw=0,
            age_string=0,
            pop_prop_3_11=0,
            pop_prop_12_59=0,
            monthly_rounds=0,
            touchpoints=0,
            tablet_factor=0,
            doses_per_child=5,
        )

        # Now, update the override via PUT
        updated_data = {
            "id": assumption.id,
            "intervention_code": self.intervention_vaccination_rts.code,
            "scenario": self.scenario.id,
            "coverage": 0.95,
            "divisor": 1,
            "bale_size": 10,
            "buffer_mult": 1.2,
            "doses_per_pw": 2,
            "age_string": "1-5",
            "pop_prop_3_11": 0.1,
            "pop_prop_12_59": 0.5,
            "monthly_rounds": 3,
            "touchpoints": 2,
            "tablet_factor": 1,
            "doses_per_child": 6,
        }

        response = self.client.put(f"{BASE_URL}{assumption.id}/", updated_data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertIsNotNone(response.data)
        self.assertEqual(response.data["id"], assumption.id)
        self.assertEqual(response.data["coverage"], "0.95")
        self.assertEqual(response.data["divisor"], "1.00")
        self.assertEqual(response.data["bale_size"], 10)
        self.assertEqual(response.data["buffer_mult"], "1.20")
        self.assertEqual(response.data["doses_per_pw"], 2)
        self.assertEqual(response.data["age_string"], "1-5")
        self.assertEqual(response.data["pop_prop_3_11"], "0.10")
        self.assertEqual(response.data["pop_prop_12_59"], "0.50")
        self.assertEqual(response.data["monthly_rounds"], 3)
        self.assertEqual(response.data["touchpoints"], 2)
        self.assertEqual(response.data["tablet_factor"], "1.00")
        self.assertEqual(response.data["doses_per_child"], 6)
