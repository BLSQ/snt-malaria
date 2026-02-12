from unittest.mock import Mock

from rest_framework.exceptions import PermissionDenied

from iaso.models.base import Account
from iaso.test import APITestCase, TestCase
from plugins.snt_malaria.api.budget_assumptions.serializers import (
    BudgetAssumptionsQuerySerializer,
    BudgetAssumptionsReadSerializer,
    BudgetAssumptionsCreateSerializer, BudgetAssumptionsUpdateSerializer,
)
from plugins.snt_malaria.models.budget_assumptions import BudgetAssumptions
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory
from plugins.snt_malaria.models.scenario import Scenario


class BudgetAssumptionsQuerySerializerTests(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="Test Account")
        self.user = self.create_user_with_profile(username="testuser", account=self.account)

        # Create a scenario
        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2028,
        )
        self.context = {"request": Mock(user=self.user)}

    def test_scenario_required(self):
        serializer = BudgetAssumptionsQuerySerializer(data={}, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertEqual(serializer.errors["scenario"][0], "This field is required.")
        # Now test with scenario provided
        serializer = BudgetAssumptionsQuerySerializer(data={"scenario": self.scenario.id}, context=self.context)
        self.assertTrue(serializer.is_valid())

    def test_scenario_validation(self):
        # Test with a scenario that does not exist
        serializer = BudgetAssumptionsQuerySerializer(data={"scenario": 9999}, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertIn("Invalid pk", serializer.errors["scenario"][0])

        # Test with a valid scenario
        serializer = BudgetAssumptionsQuerySerializer(data={"scenario": self.scenario.id}, context=self.context)
        self.assertTrue(serializer.is_valid())


class BudgetAssumptionsSerializerTests(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="Test Account")
        self.user = self.create_user_with_profile(username="testuser", account=self.account)

        # Create a scenario
        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2028,
        )

        self.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=self.account,
            created_by=self.user,
        )

        self.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=self.user,
            intervention_category=self.int_category_vaccination,
            code="rts_s",
        )

        self.intervention_vaccination_rts2 = Intervention.objects.create(
            name="RTS,S2",
            created_by=self.user,
            intervention_category=self.int_category_vaccination,
            code="rts_s2",
        )

        self.context = {"request": Mock(user=self.user)}

    def test_serializer_fields(self):
        serializer = BudgetAssumptionsReadSerializer()
        expected_fields = {
            "id",
            "scenario",
            "intervention_code",
            "coverage",
            "divisor",
            "bale_size",
            "buffer_mult",
            "doses_per_pw",
            "age_string",
            "pop_prop_3_11",
            "pop_prop_12_59",
            "monthly_rounds",
            "touchpoints",
            "tablet_factor",
            "doses_per_child",
        }
        self.assertEqual(set(serializer.fields.keys()), expected_fields)

    def test_missing_fields(self):
        data = {
            "intervention_code": "smth",
            "coverage": "0.80",
            "divisor": "1.00",
            "bale_size": 10,
            "buffer_mult": "1.20",
            "doses_per_pw": 2,
            "age_string": "3-59",
            "pop_prop_3_11": "0.1000000000",
            "pop_prop_12_59": "0.5000000000",
            "monthly_rounds": 3,
            "touchpoints": "2.5000000000",
            "doses_per_child": 6,
        }
        serializer = BudgetAssumptionsReadSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertEqual(serializer.errors["scenario"][0], "This field is required.")
        # Now provide scenario and test again
        data["scenario"] = self.scenario.id
        serializer = BudgetAssumptionsReadSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())

    def test_with_object_instance(self):
        instance = BudgetAssumptions(
            id=1,
            scenario=self.scenario,
            intervention_code=self.intervention_vaccination_rts.code,
            coverage="0.80",
            divisor="1.00",
            bale_size=10,
            buffer_mult="1.20",
            doses_per_pw=2,
            age_string="3-59",
            pop_prop_3_11="0.10",
            pop_prop_12_59="0.50",
            monthly_rounds=3,
            touchpoints=2,
            tablet_factor="0.55",
            doses_per_child=6,
        )
        serializer = BudgetAssumptionsReadSerializer(instance)
        data = serializer.data
        self.assertEqual(data["id"], 1)
        self.assertEqual(data["scenario"], self.scenario.id)
        self.assertEqual(data["intervention_code"], self.intervention_vaccination_rts.code)
        self.assertEqual(data["coverage"], "0.80")
        self.assertEqual(data["divisor"], "1.00")
        self.assertEqual(data["bale_size"], 10)
        self.assertEqual(data["buffer_mult"], "1.20")
        self.assertEqual(data["doses_per_pw"], 2)
        self.assertEqual(data["age_string"], "3-59")
        self.assertEqual(data["pop_prop_3_11"], "0.10")
        self.assertEqual(data["pop_prop_12_59"], "0.50")
        self.assertEqual(data["monthly_rounds"], 3)
        self.assertEqual(data["touchpoints"], 2)
        self.assertEqual(data["tablet_factor"], "0.55")
        self.assertEqual(data["doses_per_child"], 6)

    def test_valid_data(self):
        data = {
            "scenario": self.scenario.id,
            "intervention_code": self.intervention_vaccination_rts.code,
            "coverage": "0.80",
            "divisor": "1.00",
            "bale_size": 10,
            "buffer_mult": "1.20",
            "doses_per_pw": 2,
            "age_string": "3-59",
            "pop_prop_3_11": "0.10",
            "pop_prop_12_59": "0.50",
            "monthly_rounds": 3,
            "touchpoints": 2,
            "tablet_factor": "0.55",
            "doses_per_child": 6,
        }
        serializer = BudgetAssumptionsReadSerializer(data=data, context=self.context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertIsNotNone(instance.id)
        self.assertEqual(instance.scenario.id, self.scenario.id)
        self.assertEqual(instance.intervention_code, self.intervention_vaccination_rts.code)
        self.assertEqual(str(instance.coverage), "0.80")
        self.assertEqual(str(instance.divisor), "1.00")
        self.assertEqual(instance.bale_size, 10)
        self.assertEqual(str(instance.buffer_mult), "1.20")
        self.assertEqual(instance.doses_per_pw, 2)
        self.assertEqual(instance.age_string, "3-59")
        self.assertEqual(str(instance.pop_prop_3_11), "0.10")
        self.assertEqual(str(instance.pop_prop_12_59), "0.50")
        self.assertEqual(instance.monthly_rounds, 3)
        self.assertEqual(instance.touchpoints, 2)
        self.assertEqual(str(instance.tablet_factor), "0.55")
        self.assertEqual(instance.doses_per_child, 6)

    def test_valid_data_with_id(self):
        model = BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_code=self.intervention_vaccination_rts2.code,
            coverage="0.75",
            divisor="1.00",
            bale_size=10,
            buffer_mult="1.10",
            doses_per_pw=2,
            age_string="3-59",
            pop_prop_3_11="0.10",
            pop_prop_12_59="0.50",
            monthly_rounds=3,
            touchpoints=2,
            tablet_factor="0.50",
            doses_per_child=6,
        )

        data = {
            "id": model.id,
            "scenario": self.scenario.id,
            "intervention_code": self.intervention_vaccination_rts.code,
            "coverage": "0.80",
            "divisor": "1.00",
            "bale_size": 10,
            "buffer_mult": "1.20",
            "doses_per_pw": 2,
            "age_string": "3-59",
            "pop_prop_3_11": "0.10",
            "pop_prop_12_59": "0.50",
            "monthly_rounds": 3,
            "touchpoints": 2,
            "tablet_factor": "0.55",
            "doses_per_child": 6,
        }
        serializer = BudgetAssumptionsReadSerializer(data=data, context=self.context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.update(model, serializer.validated_data)
        self.assertIsNotNone(instance.id)
        self.assertEqual(instance.id, model.id)
        self.assertEqual(instance.scenario.id, self.scenario.id)
        self.assertEqual(instance.intervention_code, self.intervention_vaccination_rts.code)
        self.assertEqual(str(instance.coverage), "0.80")
        self.assertEqual(str(instance.divisor), "1.00")
        self.assertEqual(instance.bale_size, 10)
        self.assertEqual(str(instance.buffer_mult), "1.20")
        self.assertEqual(instance.doses_per_pw, 2)
        self.assertEqual(instance.age_string, "3-59")
        self.assertEqual(str(instance.pop_prop_3_11), "0.10")
        self.assertEqual(str(instance.pop_prop_12_59), "0.50")
        self.assertEqual(instance.monthly_rounds, 3)
        self.assertEqual(instance.touchpoints, 2)
        self.assertEqual(str(instance.tablet_factor), "0.55")
        self.assertEqual(instance.doses_per_child, 6)


class BudgetAssumptionsCreateSerializerTests(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="Test Account")
        self.user = self.create_user_with_profile(username="testuser", account=self.account)

        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2028,
        )
        self.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=self.account,
            created_by=self.user,
        )
        self.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=self.user,
            intervention_category=self.int_category_vaccination,
            code="rts_s",
        )

        self.context = {"request": Mock(user=self.user)}

    def test_missing_scenario(self):
        data = {
            "intervention_code": self.intervention_vaccination_rts.code,
            "coverage": "0.80",
            "divisor": "1.00",
            "bale_size": 10,
            "buffer_mult": "1.20",
            "doses_per_pw": 2,
            "age_string": "3-59",
            "pop_prop_3_11": "0.10",
            "pop_prop_12_59": "0.50",
            "monthly_rounds": 3,
            "touchpoints": 2,
            "doses_per_child": 6,
        }
        serializer = BudgetAssumptionsCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertEqual(serializer.errors["scenario"][0], "This field is required.")

    def test_missing_intervention(self):
        data = {
            "scenario": self.scenario.id,
            "coverage": "0.80",
            "divisor": "1.00",
            "bale_size": 10,
            "buffer_mult": "1.20",
            "doses_per_pw": 2,
            "age_string": "3-59",
            "pop_prop_3_11": "0.10",
            "pop_prop_12_59": "0.50",
            "monthly_rounds": 3,
            "touchpoints": 2,
            "doses_per_child": 6,
        }
        serializer = BudgetAssumptionsCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention_code", serializer.errors)
        self.assertEqual(serializer.errors["intervention_code"][0], "This field is required.")

    def test_invalid_scenario(self):
        data = {
            "scenario": 9999,
            "intervention_code": self.intervention_vaccination_rts.code,
            "coverage": "0.80",
            "divisor": "1.00",
            "bale_size": 10,
            "buffer_mult": "1.20",
            "doses_per_pw": 2,
            "age_string": "3-59",
            "pop_prop_3_11": "0.10",
            "pop_prop_12_59": "0.50",
            "monthly_rounds": 3,
            "touchpoints": 2,
            "doses_per_child": 6,
        }
        serializer = BudgetAssumptionsCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertEqual(serializer.errors["scenario"][0], 'Invalid pk "9999" - object does not exist.')

    def test_scenario_belongs_to_another_account(self):
        # Prepare data for another account
        new_account = Account.objects.create(name="New Account")
        new_user = self.create_user_with_profile(username="newuser", account=new_account)
        new_scenario = Scenario.objects.create(
            account=new_account,
            created_by=new_user,
            name="New Scenario",
            description="A new scenario description.",
            start_year=2025,
            end_year=2028,
        )

        data = {
            "scenario": new_scenario.id,
            "intervention_code": self.intervention_vaccination_rts.code,
            "coverage": "0.80",
            "divisor": "1.00",
            "bale_size": 10,
            "buffer_mult": "1.20",
            "doses_per_pw": 2,
            "age_string": "3-59",
            "pop_prop_3_11": "0.10",
            "pop_prop_12_59": "0.50",
            "monthly_rounds": 3,
            "touchpoints": 2,
            "doses_per_child": 6,
        }
        serializer = BudgetAssumptionsCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertIn(f'Invalid pk "{new_scenario.id}"', serializer.errors["scenario"][0])

    def test_validate_scenario_error(self):
        new_user = self.create_user_with_profile(username="newuser", account=self.account)
        new_context = {"request": Mock(user=new_user)}
        data = {
            "scenario": self.scenario.id,  # belongs to another user
            "intervention_code": self.intervention_vaccination_rts.code,
            "coverage": "0.80",
            "divisor": "1.00",
            "bale_size": 10,
            "buffer_mult": "1.20",
            "doses_per_pw": 2,
            "age_string": "3-59",
            "pop_prop_3_11": "0.10",
            "pop_prop_12_59": "0.50",
            "monthly_rounds": 3,
            "touchpoints": 2,
            "doses_per_child": 6,
        }
        serializer = BudgetAssumptionsCreateSerializer(data=data, context=new_context)
        with self.assertRaisesMessage(PermissionDenied, "User does not have permission to modify assumptions for this scenario"):
            serializer.is_valid()


class BudgetAssumptionsUpdateSerializerTests(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="Test Account")
        self.user = self.create_user_with_profile(username="testuser", account=self.account)

        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2028,
        )
        self.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=self.account,
            created_by=self.user,
        )
        self.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=self.user,
            intervention_category=self.int_category_vaccination,
            code="rts_s",
        )

        self.budget_assumption = BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_code=self.intervention_vaccination_rts.code,
            coverage="0.80",
            divisor="1.00",
            bale_size=10,
            buffer_mult="1.20",
            doses_per_pw=2,
            age_string="3-59",
            pop_prop_3_11="0.10",
            pop_prop_12_59="0.50",
            monthly_rounds=3,
            touchpoints=2,
            tablet_factor="0.55",
            doses_per_child=6,
        )

    def test_invalid_fields(self):
        data = {
            "coverage": "1.50",  # Invalid: greater than 1
            "divisor": "-0.10",  # Invalid: less than 0
            "bale_size": 1000,  # Invalid: greater than max_value
            "buffer_mult": "-1.00",  # Invalid: less than 0
            "doses_per_pw": 999999999,  # Invalid: greater than max_value
            "age_string": "3-59",
            "pop_prop_3_11": "0.10",
            "pop_prop_12_59": "0.50",
            "monthly_rounds": 32,  # Invalid: greater than max_value
            "touchpoints": -10,  # Invalid: less than min_value
            "doses_per_child": -6,  # Invalid: less than min_value
        }
        serializer = BudgetAssumptionsUpdateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("coverage", serializer.errors)
        self.assertIn("divisor", serializer.errors)
        self.assertIn("bale_size", serializer.errors)
        self.assertIn("buffer_mult", serializer.errors)
        self.assertIn("monthly_rounds", serializer.errors)
        self.assertIn("touchpoints", serializer.errors)
        self.assertIn("doses_per_child", serializer.errors)

    def test_valid_data(self):
        data = {
            "coverage": "0.90",
            "divisor": "2.00",
            "bale_size": 20,
            "buffer_mult": "2.20",
            "doses_per_pw": 4,
            "age_string": "42-69",
            "pop_prop_3_11": "2.10",
            "pop_prop_12_59": "2.50",
            "monthly_rounds": 30,
            "touchpoints": 22,
            "tablet_factor": "0.99",
            "doses_per_child": 62,
        }
        serializer = BudgetAssumptionsUpdateSerializer(data=data, instance=self.budget_assumption)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.budget_assumption.refresh_from_db()
        self.assertEqual(self.budget_assumption.scenario.id, self.scenario.id)
        self.assertEqual(self.budget_assumption.intervention_code, self.intervention_vaccination_rts.code)
        self.assertEqual(str(self.budget_assumption.coverage), "0.90")
        self.assertEqual(str(self.budget_assumption.divisor), "2.00")
        self.assertEqual(self.budget_assumption.bale_size, 20)
        self.assertEqual(str(self.budget_assumption.buffer_mult), "2.20")
        self.assertEqual(self.budget_assumption.doses_per_pw, 4)
        self.assertEqual(self.budget_assumption.age_string, "42-69")
        self.assertEqual(str(self.budget_assumption.pop_prop_3_11), "2.10")
        self.assertEqual(str(self.budget_assumption.pop_prop_12_59), "2.50")
        self.assertEqual(self.budget_assumption.monthly_rounds, 30)
        self.assertEqual(self.budget_assumption.touchpoints, 22)
        self.assertEqual(str(self.budget_assumption.tablet_factor), "0.99")
        self.assertEqual(self.budget_assumption.doses_per_child, 62)
