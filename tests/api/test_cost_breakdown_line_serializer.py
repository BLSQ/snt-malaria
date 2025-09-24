from iaso.models.base import Account
from iaso.test import APITestCase
from plugins.snt_malaria.api.cost_breakdown_line.serializers import (
    InterventionCostBreakdownLineSerializer,
    InterventionCostBreakdownLinesWriteSerializer,
)
from plugins.snt_malaria.models.cost_breakdown import InterventionCostBreakdownLine
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory


class InterventionCostBreakdownLineSerializerTests(APITestCase):
    def setUp(cls):
        cls.account = Account.objects.create(name="Test Account")
        cls.user = cls.create_user_with_profile(username="testuser", account=cls.account)
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
        cls.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=cls.user,
            intervention_category=cls.int_category_vaccination,
        )
        cls.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
        )
        cls.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
        )
        cls.cost_line1 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 1",
            intervention=cls.intervention_vaccination_rts,
            unit_cost=10,
            category="Procurement",
            created_by=cls.user,
        )
        cls.cost_line2 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 2",
            intervention=cls.intervention_chemo_smc,
            unit_cost=5,
            category="Procurement",
            created_by=cls.user,
        )

    def test_create_cost_breakdown_line_missing_intervention(self):
        data = {
            "costs": [{"unit_cost": 15, "unit_type": "doses", "category": "Procurement"}],
        }
        serializer = InterventionCostBreakdownLinesWriteSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention", serializer.errors)

    def test_create_cost_breakdown_line_missing_costs(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
        }
        serializer = InterventionCostBreakdownLinesWriteSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("costs", serializer.errors)

    def test_create_cost_breakdown_line_cost_below_zero(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"unit_cost": -5, "name": "test", "category": "Procurement"}],
        }
        serializer = InterventionCostBreakdownLineSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("unit_cost", serializer.errors)

    def test_create_cost_breakdown_line_missing_costs_name(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"unit_cost": 15, "category": "Procurement"}],
        }
        serializer = InterventionCostBreakdownLineSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)

    def test_create_cost_breakdown_line_missing_costs_cost(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"name": "test", "category": "Procurement"}],
        }
        serializer = InterventionCostBreakdownLineSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("unit_cost", serializer.errors)

    def test_create_cost_breakdown_line_missing_costs_category(self):
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"name": "test", "unit_cost": 15}],
        }
        serializer = InterventionCostBreakdownLineSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("category", serializer.errors)

    def test_create_cost_breakdown_line_invalid_category(self):
        invalid_category_id = 9999  # Assuming this ID does not exist
        data = {
            "intervention": self.intervention_chemo_iptp.id,
            "costs": [{"name": "test", "unit_cost": 15, "category": invalid_category_id}],
        }
        serializer = InterventionCostBreakdownLineSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("category", serializer.errors)
