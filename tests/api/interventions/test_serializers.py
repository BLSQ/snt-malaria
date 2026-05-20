from iaso.models.base import Account
from iaso.test import APITestCase
from plugins.snt_malaria.api.interventions.serializers import InterventionDetailWriteSerializer
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory


class InterventionDetailWriteSerializerTests(APITestCase):
    def setUp(self):
        self.account = Account.objects.create(name="Test Account 3")
        self.user = self.create_user_with_profile(username="testuserintervention", account=self.account)
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

    def test_update_intervention_with_cost_breakdown_lines(self):
        intervention_data = {
            "id": self.intervention_vaccination_rts.id,
            "name": "Test Intervention",
            "impact_ref": "some_ref",
            "cost_breakdown_lines": [
                {
                    "name": "Line 1",
                    "unit_cost": 10,
                    "category": "Procurement",
                    "intervention": self.intervention_vaccination_rts.id,
                },
                {
                    "name": "Line 2",
                    "unit_cost": 20,
                    "category": "Distribution",
                    "intervention": self.intervention_vaccination_rts.id,
                },
            ],
        }
        serializer = InterventionDetailWriteSerializer(
            instance=self.intervention_vaccination_rts, data=intervention_data
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        intervention = serializer.save()

        self.assertEqual(intervention.name, intervention_data["name"])
        self.assertEqual(intervention.impact_ref, intervention_data["impact_ref"])
        self.assertEqual(intervention.cost_breakdown_lines.count(), 2)
        line_names = [line.name for line in intervention.cost_breakdown_lines.all()]
        self.assertIn("Line 1", line_names)
        self.assertIn("Line 2", line_names)

    def test_update_intervention_with_empty_cost_breakdown_lines(self):
        intervention_data = {
            "id": self.intervention_vaccination_rts.id,
            "name": "Test Intervention",
            "impact_ref": "some_ref",
            "cost_breakdown_lines": [],
        }
        serializer = InterventionDetailWriteSerializer(
            instance=self.intervention_vaccination_rts, data=intervention_data
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        intervention = serializer.save()

        self.assertEqual(intervention.name, intervention_data["name"])
        self.assertEqual(intervention.impact_ref, intervention_data["impact_ref"])
        self.assertEqual(intervention.cost_breakdown_lines.count(), 0)

    def test_update_intervention_without_cost_breakdown_lines(self):
        intervention_data = {
            "id": self.intervention_vaccination_rts.id,
            "name": "Test Intervention",
            "impact_ref": "some_ref",
        }
        serializer = InterventionDetailWriteSerializer(
            instance=self.intervention_vaccination_rts, data=intervention_data
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        intervention = serializer.save()

        self.assertEqual(intervention.name, intervention_data["name"])
        self.assertEqual(intervention.impact_ref, intervention_data["impact_ref"])
        self.assertEqual(intervention.cost_breakdown_lines.count(), 0)
