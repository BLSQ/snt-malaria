from iaso.models.base import Account
from iaso.test import APITestCase
from plugins.snt_malaria.api.budget_assumptions.serializers import (
    BudgetAssumptionsQuerySerializer,
    BudgetAssumptionsSerializer,
    BudgetAssumptionsWriteSerializer,
)
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory
from plugins.snt_malaria.models.scenario import Scenario


class BudgetAssumptionsQuerySerializerTests(APITestCase):
    def setUp(cls):
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

    def test_scenario_required(self):
        serializer = BudgetAssumptionsQuerySerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertEqual(serializer.errors["scenario"][0], "This field is required.")
        # Now test with scenario provided
        serializer = BudgetAssumptionsQuerySerializer(data={"scenario": self.scenario.id})
        self.assertTrue(serializer.is_valid())

    def test_scenario_validation(self):
        # Test with a scenario that does not exist
        serializer = BudgetAssumptionsQuerySerializer(data={"scenario": 9999})
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertIn("Invalid pk", serializer.errors["scenario"][0])

        # Test with a valid scenario
        serializer = BudgetAssumptionsQuerySerializer(data={"scenario": self.scenario.id})
        self.assertTrue(serializer.is_valid())


class BudgetAssumptionsSerializerTests(APITestCase):
    def setUp(cls):
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

        cls.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=cls.account,
            created_by=cls.user,
        )

        cls.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=cls.user,
            intervention_category=cls.int_category_vaccination,
            code="rts_s",
        )

    def test_serializer_fields(self):
        serializer = BudgetAssumptionsSerializer()
        expected_fields = {
            "id",
            "scenario",
            "intervention",
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
            "intervention": 99,
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
        serializer = BudgetAssumptionsSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertEqual(serializer.errors["scenario"][0], "This field is required.")
        self.assertEqual(serializer.errors["intervention"][0], 'Invalid pk "99" - object does not exist.')
        # Now provide scenario and test again
        data["scenario"] = self.scenario.id
        serializer = BudgetAssumptionsSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention", serializer.errors)
        self.assertEqual(serializer.errors["intervention"][0], 'Invalid pk "99" - object does not exist.')


class BudgetAssumptionsWriteSerializerTests(APITestCase):
    def setUp(cls):
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

        cls.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=cls.account,
            created_by=cls.user,
        )

        cls.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=cls.user,
            intervention_category=cls.int_category_vaccination,
            code="rts_s",
        )

    def test_missing_scenario(self):
        data = {
            "intervention": self.intervention_vaccination_rts.id,
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
        serializer = BudgetAssumptionsWriteSerializer(data=data)
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
        serializer = BudgetAssumptionsWriteSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention", serializer.errors)
        self.assertEqual(serializer.errors["intervention"][0], "This field is required.")

    def test_invalid_intervention(self):
        data = {
            "scenario": self.scenario.id,
            "intervention": 9999,
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
        serializer = BudgetAssumptionsWriteSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention", serializer.errors)
        self.assertEqual(serializer.errors["intervention"][0], 'Invalid pk "9999" - object does not exist.')

    def test_invalid_scenario(self):
        data = {
            "scenario": 9999,
            "intervention": self.intervention_vaccination_rts.id,
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
        serializer = BudgetAssumptionsWriteSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertEqual(serializer.errors["scenario"][0], 'Invalid pk "9999" - object does not exist.')

    def test_invalid_fields(self):
        data = {
            "scenario": self.scenario.id,
            "intervention": self.intervention_vaccination_rts.id,
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
        serializer = BudgetAssumptionsWriteSerializer(data=data)
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
            "scenario": self.scenario.id,
            "intervention": self.intervention_vaccination_rts.id,
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
        serializer = BudgetAssumptionsWriteSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertIsNotNone(instance.id)
        self.assertEqual(instance.scenario.id, self.scenario.id)
        self.assertEqual(instance.intervention.id, self.intervention_vaccination_rts.id)
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
