from typing import OrderedDict

from rest_framework import status

from iaso.models import Account
from iaso.test import APITestCase
from plugins.snt_malaria.models import BudgetAssumptions, Intervention, InterventionCategory, Scenario
from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION, SNT_SCENARIO_FULL_WRITE_PERMISSION


BASE_URL = "/api/snt_malaria/budget_assumptions/"


class BudgetAssumptionsAPITestCase(APITestCase):
    def setUp(self):
        # Create a user and account for testing
        self.account, self.source, self.version, self.project = self.create_account_datasource_version_project(
            "source", "Test Account", "project"
        )
        self.user_with_full_perm, self.anon, self.user_no_perms = self.create_base_users(
            self.account, [SNT_SCENARIO_FULL_WRITE_PERMISSION], "testuser"
        )
        self.user_with_basic_perm = self.create_user_with_profile(
            username="testuserbasic", account=self.account, permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION]
        )

        # Create a scenario
        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_full_perm,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2028,
        )

        # Create intervention categories
        self.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=self.account,
            created_by=self.user_with_full_perm,
        )
        self.int_category_chemoprevention = InterventionCategory.objects.create(
            name="Preventive Chemotherapy",
            account=self.account,
            created_by=self.user_with_full_perm,
        )

        # Create interventions
        self.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=self.user_with_full_perm,
            intervention_category=self.int_category_vaccination,
            code="rts_s",
        )
        self.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=self.user_with_full_perm,
            intervention_category=self.int_category_chemoprevention,
            code="smc",
        )
        self.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=self.user_with_full_perm,
            intervention_category=self.int_category_chemoprevention,
            code="iptp",
        )

        self.assumption = BudgetAssumptions.objects.create(
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

        # Prepare other account and data for tenancy tests
        self.other_account = Account.objects.create(name="Other Account")
        self.other_user = self.create_user_with_profile(
            username="otheruser", account=self.other_account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )
        self.other_scenario = Scenario.objects.create(
            account=self.other_account,
            created_by=self.other_user,
            name="Other Scenario",
            description="Another test scenario description.",
            start_year=2025,
            end_year=2028,
        )
        self.other_intervention_category = InterventionCategory.objects.create(
            name="Other Category",
            account=self.other_account,
            created_by=self.other_user,
        )
        self.other_intervention = Intervention.objects.create(
            name="Other Intervention",
            created_by=self.other_user,
            intervention_category=self.other_intervention_category,
            code="other_int",
        )

        self.other_assumption = BudgetAssumptions.objects.create(
            intervention_code=self.other_intervention.code,
            scenario=self.other_scenario,
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

    def test_get_budget_assumptions_unauthenticated(self):
        response = self.client.get(f"{BASE_URL}?scenario={self.scenario.id}")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_budget_assumptions_invalid_scenario(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{BASE_URL}?scenario=9999")  # Non-existent scenario ID
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario", result)

    def test_get_budget_assumptions_scenario_other_account(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{BASE_URL}?scenario={self.other_scenario.id}")  # Scenario from other account
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario", result)

    def test_get_budget_assumptions_default_values(self):
        """
        This endpoint is available to all authenticated users, regardless of permissions.
        """
        # removing the existing assumption to get default values
        self.assumption.delete()

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{BASE_URL}?scenario={self.scenario.id}")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 3)
        self.assertEqual(
            result,
            [
                OrderedDict(
                    [
                        ("id", None),
                        ("scenario", self.scenario.id),
                        ("intervention_code", self.intervention_chemo_iptp.code),
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
                        ("scenario", self.scenario.id),
                        ("intervention_code", self.intervention_vaccination_rts.code),
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
                        ("scenario", self.scenario.id),
                        ("intervention_code", self.intervention_chemo_smc.code),
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

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.get(f"{BASE_URL}?scenario={self.scenario.id}")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 3)

        self.client.force_authenticate(user=self.user_no_perms)
        response = self.client.get(f"{BASE_URL}?scenario={self.scenario.id}")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 3)

    def test_get_budget_assumptions_with_existing(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{BASE_URL}?scenario={self.scenario.id}")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 3)

        # Check that the override (from setup) is reflected in the response
        for item in result:
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
            "scenario": 9999,  # Non-existent scenario ID
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

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, override_data, format="json")
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario", result)

    def test_post_budget_assumptions_scenario_other_account(self):
        override_data = {
            "intervention_code": self.intervention_vaccination_rts.code,
            "scenario": self.other_scenario.id,  # Scenario from other account
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

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, override_data, format="json")
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario", result)

    def test_post_budget_assumptions_unknown_intervention_code(self):
        """
        The intervention code does not need to match an existing intervention, as intervention_code is a simple CharField
        """
        override_data = {
            "intervention_code": "non_existent_code",  # does not represent any intervention
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
        count_before = BudgetAssumptions.objects.count()

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, override_data, format="json")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        self.assertIsNotNone(result["id"])
        count_after = BudgetAssumptions.objects.count()
        self.assertEqual(count_after, count_before + 1)
        assumption = BudgetAssumptions.objects.get(id=result["id"])
        self.assertEqual(assumption.intervention_code, "non_existent_code")

    def test_post_budget_assumptions_intervention_other_account(self):
        """
        Since there's no check on intervention code (simple CharField),
        it's possible to use a code that belongs to an intervention from another account
        """
        override_data = {
            "intervention_code": self.other_intervention.code,  # Intervention from other account
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
        count_before = BudgetAssumptions.objects.count()

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, override_data, format="json")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        self.assertIsNotNone(result["id"])
        count_after = BudgetAssumptions.objects.count()
        self.assertEqual(count_after, count_before + 1)
        assumption = BudgetAssumptions.objects.get(id=result["id"])
        self.assertEqual(assumption.intervention_code, self.other_intervention.code)

    def test_post_budget_assumptions_with_full_perm_own_scenario(self):
        # Create an override for one intervention
        override_data = {
            "intervention_code": self.intervention_chemo_iptp.code,
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

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, override_data, format="json")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        self.assertIsNotNone(result)
        self.assertIsNotNone(result["id"])
        self.assertEqual(result["coverage"], "0.90")
        self.assertEqual(result["doses_per_child"], 5)

    def test_post_budget_assumptions_with_full_perm_other_scenario(self):
        # Create a different scenario owned by another user
        other_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Other Scenario",
            description="Another test scenario description.",
            start_year=2025,
            end_year=2028,
        )

        override_data = {
            "intervention_code": self.intervention_vaccination_rts.code,
            "scenario": other_scenario.id,
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

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(BASE_URL, override_data, format="json")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        self.assertIsNotNone(result)
        self.assertIsNotNone(result["id"])
        self.assertEqual(result["coverage"], "0.90")
        self.assertEqual(result["doses_per_child"], 5)

    def test_post_budget_assumptions_with_basic_perm_own_scenario(self):
        own_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Basic Perm Scenario",
            description="A test scenario for basic perm user.",
            start_year=2025,
            end_year=2028,
        )
        override_data = {
            "intervention_code": self.intervention_vaccination_rts.code,
            "scenario": own_scenario.id,
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

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.post(BASE_URL, override_data, format="json")
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)

        self.assertIsNotNone(result)
        self.assertIsNotNone(result["id"])
        self.assertEqual(result["coverage"], "0.90")
        self.assertEqual(result["doses_per_child"], 5)

    def test_post_budget_assumptions_with_basic_perm_other_scenario(self):
        override_data = {
            "intervention_code": self.intervention_vaccination_rts.code,
            "scenario": self.scenario.id,  # owned by user_with_full_perm
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

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.post(BASE_URL, override_data, format="json")
        result = self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)
        self.assertIn("User does not have permission to modify assumptions for this scenario", result["detail"])

    def test_put_budget_assumptions_unauthenticated(self):
        updated_data = {
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
        response = self.client.put(f"{BASE_URL}{self.assumption.id}/", updated_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_put_budget_assumptions_with_full_perm_own_scenario(self):
        updated_data = {
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

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.put(f"{BASE_URL}{self.assumption.id}/", updated_data, format="json")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)

        self.assertIsNotNone(result)
        self.assumption.refresh_from_db()
        self.assertEqual(str(self.assumption.coverage), "0.95")
        self.assertEqual(str(self.assumption.divisor), "1.00")
        self.assertEqual(self.assumption.bale_size, 10)
        self.assertEqual(str(self.assumption.buffer_mult), "1.20")
        self.assertEqual(self.assumption.doses_per_pw, 2)
        self.assertEqual(self.assumption.age_string, "1-5")
        self.assertEqual(str(self.assumption.pop_prop_3_11), "0.10")
        self.assertEqual(str(self.assumption.pop_prop_12_59), "0.50")
        self.assertEqual(self.assumption.monthly_rounds, 3)
        self.assertEqual(self.assumption.touchpoints, 2)
        self.assertEqual(str(self.assumption.tablet_factor), "1.00")
        self.assertEqual(self.assumption.doses_per_child, 6)

    def test_put_budget_assumptions_with_full_perm_other_scenario(self):
        # Create a different scenario owned by another user
        other_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Other Scenario",
            description="Another test scenario description.",
            start_year=2025,
            end_year=2028,
        )

        # Create an assumption for that scenario
        other_assumption = BudgetAssumptions.objects.create(
            intervention_code=self.intervention_chemo_iptp.code,
            scenario=other_scenario,
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

        updated_data = {
            "coverage": 0.95,
            "divisor": 1,
            "bale_size": 10,
            "buffer_mult": 1.2,
            "doses_per_pw": 2,
            "age_string": "1-5",
            "pop_prop_3_11": 0.1,
            "pop_prop_12_59": 0.5,
            "monthly_rounds": 3,
            "touchpoints": 5,
            "tablet_factor": 1,
            "doses_per_child": 6,
        }

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.put(f"{BASE_URL}{other_assumption.id}/", updated_data, format="json")
        self.assertJSONResponse(response, status.HTTP_200_OK)

        other_assumption.refresh_from_db()
        self.assertEqual(str(other_assumption.coverage), "0.95")
        self.assertEqual(str(other_assumption.divisor), "1.00")
        self.assertEqual(other_assumption.bale_size, 10)
        self.assertEqual(str(other_assumption.buffer_mult), "1.20")
        self.assertEqual(other_assumption.doses_per_pw, 2)
        self.assertEqual(other_assumption.age_string, "1-5")
        self.assertEqual(str(other_assumption.pop_prop_3_11), "0.10")
        self.assertEqual(str(other_assumption.pop_prop_12_59), "0.50")
        self.assertEqual(other_assumption.monthly_rounds, 3)
        self.assertEqual(other_assumption.touchpoints, 5)
        self.assertEqual(str(other_assumption.tablet_factor), "1.00")
        self.assertEqual(other_assumption.doses_per_child, 6)

    def test_put_budget_assumptions_with_basic_perm_own_scenario(self):
        own_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Basic Perm Scenario",
            description="A test scenario for basic perm user.",
            start_year=2025,
            end_year=2028,
        )
        own_assumption = BudgetAssumptions.objects.create(
            intervention_code=self.intervention_chemo_iptp.code,
            scenario=own_scenario,
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

        updated_data = {
            "coverage": 0.95,
            "divisor": 1,
            "bale_size": 10,
            "buffer_mult": 1.2,
            "doses_per_pw": 2,
            "age_string": "1-5",
            "pop_prop_3_11": 0.1,
            "pop_prop_12_59": 0.5,
            "monthly_rounds": 3,
            "touchpoints": 5,
            "tablet_factor": 1,
            "doses_per_child": 6,
        }

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.put(f"{BASE_URL}{own_assumption.id}/", updated_data, format="json")
        self.assertJSONResponse(response, status.HTTP_200_OK)

        own_assumption.refresh_from_db()
        self.assertEqual(str(own_assumption.coverage), "0.95")
        self.assertEqual(str(own_assumption.divisor), "1.00")
        self.assertEqual(own_assumption.bale_size, 10)
        self.assertEqual(str(own_assumption.buffer_mult), "1.20")
        self.assertEqual(own_assumption.doses_per_pw, 2)
        self.assertEqual(own_assumption.age_string, "1-5")
        self.assertEqual(str(own_assumption.pop_prop_3_11), "0.10")
        self.assertEqual(str(own_assumption.pop_prop_12_59), "0.50")
        self.assertEqual(own_assumption.monthly_rounds, 3)
        self.assertEqual(own_assumption.touchpoints, 5)
        self.assertEqual(str(own_assumption.tablet_factor), "1.00")
        self.assertEqual(own_assumption.doses_per_child, 6)

    def test_put_budget_assumptions_with_basic_perm_other_scenario(self):
        updated_data = {
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

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.put(f"{BASE_URL}{self.assumption.id}/", updated_data, format="json")
        result = self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)
        self.assertIn("You do not have permission to perform this action.", result["detail"])

    def test_put_budget_assumptions_no_perm(self):
        updated_data = {
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

        self.client.force_authenticate(user=self.user_no_perms)
        response = self.client.put(f"{BASE_URL}{self.assumption.id}/", updated_data, format="json")
        result = self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)
        self.assertIn("You do not have permission to perform this action.", result["detail"])

    def test_put_budget_assumptions_unknown_assumption_id(self):
        updated_data = {
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
        unknown_assumption_id = 9999  # Assuming this ID does not exist in the test database

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.put(f"{BASE_URL}{unknown_assumption_id}/", updated_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
