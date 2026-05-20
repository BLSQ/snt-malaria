from unittest.mock import Mock

from rest_framework.exceptions import PermissionDenied
from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS

from plugins.snt_malaria.api.budget_assumptions.serializers import (
    BudgetAssumptionsQuerySerializer,
    BudgetAssumptionsReadSerializer,
    BudgetAssumptionsUpdateSerializer,
    BudgetAssumptionsUpsertManySerializer,
    DefaultCostAssumptionsSerializer,
)
from plugins.snt_malaria.models import (
    BudgetAssumptions,
)
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


class BudgetAssumptionsSerializerBaseTestCase(SNTMalariaTestCase):
    def setUp(self):
        super().setUp()

        self.full_perm_user = self.create_user_with_profile(
            username="fullperm", account=self.account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )

        self.other_user = self.create_user_with_profile(username="otheruser", account=self.account)

        self.scenario = self.create_snt_scenario(account=self.account, created_by=self.user, name="Scenario A")
        self.other_user_scenario = self.create_snt_scenario(
            account=self.account,
            created_by=self.other_user,
            name="Scenario B",
        )

        self.other_account, self.other_account_user = self.create_snt_account(
            name="Other Account",
            username="external",
        )
        self.other_account_scenario = self.create_snt_scenario(
            account=self.other_account,
            created_by=self.other_account_user,
            name="Other Account Scenario",
        )

        self.intervention_category = self.create_snt_intervention_category(
            name="Vaccination",
        )
        self.intervention_a = self.create_snt_intervention(
            name="RTS,S",
            intervention_category=self.intervention_category,
            code="rts_s",
        )
        self.intervention_b = self.create_snt_intervention(
            name="SMC",
            intervention_category=self.intervention_category,
            code="smc",
        )

        self.org_unit_type = self.create_snt_org_unit_type(name="DISTRICT")
        self.org_1 = self.create_snt_org_unit(org_unit_type=self.org_unit_type, name="District 1")
        self.org_2 = self.create_snt_org_unit(org_unit_type=self.org_unit_type, name="District 2")

        self.assignment_a = self.create_snt_assignment(self.scenario, self.org_1, self.intervention_a, self.user)
        self.assignment_b = self.create_snt_assignment(self.scenario, self.org_2, self.intervention_b, self.user)
        self.assignment_other_scenario = self.create_snt_assignment(
            self.other_user_scenario,
            self.org_1,
            self.intervention_a,
            self.other_user,
        )

        self.other_account_category = self.create_snt_intervention_category(
            name="Other Category",
            account=self.other_account,
            created_by=self.other_account_user,
        )
        self.other_account_intervention = self.create_snt_intervention(
            name="Other Intervention",
            created_by=self.other_account_user,
            intervention_category=self.other_account_category,
            code="other_int",
        )
        self.other_account_assignment = self.create_snt_assignment(
            self.other_account_scenario,
            self.org_1,
            self.other_account_intervention,
            self.other_account_user,
        )

    def _context_for(self, user):
        return {"request": Mock(user=user)}


class BudgetAssumptionsQuerySerializerTests(BudgetAssumptionsSerializerBaseTestCase):
    def test_scenario_is_required(self):
        serializer = BudgetAssumptionsQuerySerializer(data={}, context=self._context_for(self.user))
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)

    def test_only_scenarios_from_users_account_are_allowed(self):
        serializer = BudgetAssumptionsQuerySerializer(
            data={"scenario": self.other_account_scenario.id},
            context=self._context_for(self.user),
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)

    def test_year_is_optional_and_nullable(self):
        serializer = BudgetAssumptionsQuerySerializer(
            data={"scenario": self.scenario.id, "year": None},
            context=self._context_for(self.user),
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)


class BudgetAssumptionsReadSerializerTests(BudgetAssumptionsSerializerBaseTestCase):
    def test_serializer_fields(self):
        serializer = BudgetAssumptionsReadSerializer()
        self.assertEqual(
            set(serializer.fields.keys()),
            {"id", "scenario", "intervention_assignment", "year", "coverage"},
        )

    def test_serializes_instance(self):
        assumption = BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment_a,
            year=2025,
            coverage=0.80,
        )

        serializer = BudgetAssumptionsReadSerializer(assumption)
        self.assertEqual(serializer.data["id"], assumption.id)
        self.assertEqual(serializer.data["scenario"], self.scenario.id)
        self.assertEqual(serializer.data["intervention_assignment"], self.assignment_a.id)
        self.assertEqual(serializer.data["year"], 2025)
        self.assertEqual(serializer.data["coverage"], "0.80")


class BudgetAssumptionsUpdateSerializerTests(BudgetAssumptionsSerializerBaseTestCase):
    def test_invalid_coverage_range(self):
        serializer = BudgetAssumptionsUpdateSerializer(data={"coverage": 1.5, "year": 2025})
        self.assertFalse(serializer.is_valid())
        self.assertIn("coverage", serializer.errors)

    def test_year_can_be_null(self):
        serializer = BudgetAssumptionsUpdateSerializer(data={"coverage": 0.60, "year": None})
        self.assertTrue(serializer.is_valid(), serializer.errors)


class DefaultCostAssumptionsSerializerTests(BudgetAssumptionsSerializerBaseTestCase):
    def test_uses_default_coverage_for_given_intervention_code(self):
        serializer = DefaultCostAssumptionsSerializer()
        expected_defaults = DEFAULT_COST_ASSUMPTIONS
        for key, value in serializer.data:
            coverage_key = f"{key}_coverage"
            self.assertIn(coverage_key, expected_defaults)
            self.assertEqual(value["coverage"], expected_defaults[coverage_key])


class BudgetAssumptionsUpsertManySerializerTests(BudgetAssumptionsSerializerBaseTestCase):
    def test_empty_assignments_are_rejected(self):
        data = {
            "scenario": self.scenario.id,
            "intervention_assignments": [],
            "budget_assumptions": [{"year": 2025, "coverage": 0.80}],
        }
        serializer = BudgetAssumptionsUpsertManySerializer(data=data, context=self._context_for(self.user))
        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention_assignments", serializer.errors)

    def test_invalid_assignment_id_is_rejected(self):
        data = {
            "scenario": self.scenario.id,
            "intervention_assignments": [9999],  # Non-existent ID
            "budget_assumptions": [{"year": 2025, "coverage": 0.80}],
        }
        serializer = BudgetAssumptionsUpsertManySerializer(data=data, context=self._context_for(self.user))
        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention_assignments", serializer.errors)

    def test_assignments_from_other_scenario_are_rejected(self):
        data = {
            "scenario": self.scenario.id,
            "intervention_assignments": [self.assignment_other_scenario.id],
            "budget_assumptions": [{"year": 2025, "coverage": 0.80}],
        }
        serializer = BudgetAssumptionsUpsertManySerializer(data=data, context=self._context_for(self.user))
        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention_assignments", serializer.errors)

    def test_scenario_permissions_reject_non_owner_without_full_write(self):
        data = {
            "scenario": self.other_user_scenario.id,
            "intervention_assignments": [self.assignment_other_scenario.id],
            "budget_assumptions": [{"year": 2025, "coverage": 0.80}],
        }
        serializer = BudgetAssumptionsUpsertManySerializer(data=data, context=self._context_for(self.user))
        with self.assertRaisesMessage(
            PermissionDenied, "User does not have permission to modify assumptions for this scenario"
        ):
            serializer.is_valid(raise_exception=True)

    def test_scenario_permissions_allow_full_write_user(self):
        data = {
            "scenario": self.other_user_scenario.id,
            "intervention_assignments": [self.assignment_other_scenario.id],
            "budget_assumptions": [{"year": 2025, "coverage": 0.80}],
        }
        serializer = BudgetAssumptionsUpsertManySerializer(data=data, context=self._context_for(self.full_perm_user))
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_save_creates_one_row_per_assignment_and_year(self):
        data = {
            "scenario": self.scenario.id,
            "intervention_assignments": [self.assignment_a.id, self.assignment_b.id],
            "budget_assumptions": [
                {"year": 2025, "coverage": 0.80},
                {"year": 2026, "coverage": 0.90},
            ],
        }
        serializer = BudgetAssumptionsUpsertManySerializer(data=data, context=self._context_for(self.user))
        self.assertTrue(serializer.is_valid(), serializer.errors)

        serializer.save()

        assumptions = BudgetAssumptions.objects.filter(scenario=self.scenario)
        self.assertEqual(assumptions.count(), 4)
        self.assertEqual(
            set(assumptions.values_list("intervention_assignment_id", "year")),
            {
                (self.assignment_a.id, 2025),
                (self.assignment_a.id, 2026),
                (self.assignment_b.id, 2025),
                (self.assignment_b.id, 2026),
            },
        )

    def test_save_replaces_only_targeted_scenario_assignment_and_year(self):
        target = BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment_a,
            year=2025,
            coverage=0.10,
        )
        same_scenario_other_assignment = BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment_b,
            year=2025,
            coverage=0.20,
        )
        same_scenario_other_year = BudgetAssumptions.objects.create(
            scenario=self.scenario,
            intervention_assignment=self.assignment_a,
            year=2026,
            coverage=0.30,
        )
        other_scenario_row = BudgetAssumptions.objects.create(
            scenario=self.other_user_scenario,
            intervention_assignment=self.assignment_other_scenario,
            year=2025,
            coverage=0.40,
        )

        data = {
            "scenario": self.scenario.id,
            "intervention_assignments": [self.assignment_a.id],
            "budget_assumptions": [{"year": 2025, "coverage": 0.95}],
        }

        serializer = BudgetAssumptionsUpsertManySerializer(data=data, context=self._context_for(self.user))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        assumptions = BudgetAssumptions.objects.filter(scenario=self.scenario)
        self.assertEqual(assumptions.count(), 3)  # Only the target row should be replaced, not the others

        # Verify that previous value has been removed
        with self.assertRaisesMessage(
            BudgetAssumptions.DoesNotExist, "BudgetAssumptions matching query does not exist"
        ):
            target = assumptions.get(id=target.id)

        target = assumptions.get(intervention_assignment=self.assignment_a, year=2025)

        same_scenario_other_year = assumptions.get(
            id=same_scenario_other_year.id
        )  # Should still exist with same values)
        same_scenario_other_assignment = assumptions.get(id=same_scenario_other_assignment.id)
        other_scenario_row = BudgetAssumptions.objects.get(id=other_scenario_row.id)

        self.assertEqual(str(target.coverage), "0.95")
        self.assertEqual(str(same_scenario_other_assignment.coverage), "0.20")
        self.assertEqual(str(same_scenario_other_year.coverage), "0.30")
        self.assertEqual(str(other_scenario_row.coverage), "0.40")
