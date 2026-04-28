import pandas as pd

from django.contrib.gis.geos import Point

from iaso.models import Account, MetricType, MetricValue, OrgUnit, OrgUnitType
from iaso.models.data_source import DataSource, SourceVersion
from iaso.models.project import Project
from iaso.test import TestCase
from plugins.snt_malaria.api.scenarios.utils import (
    DEFAULT_IMPORT_COVERAGE,
    _build_intervention_groups,
    _get_dispersed_color,
    create_rules_from_import,
    duplicate_rules,
    get_intervention_column,
)
from plugins.snt_malaria.models import (
    Intervention,
    InterventionAssignment,
    InterventionCategory,
    Scenario,
    ScenarioRule,
    ScenarioRuleInterventionProperties,
)


class ScenarioAPIUtilsTestCase(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="account")
        self.user_1 = self.create_user_with_profile(username="user_1", account=self.account)
        self.user_2 = self.create_user_with_profile(username="user_2", account=self.account)

        # Create intervention categories
        self.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=self.account,
            created_by=self.user_1,
        )

        self.int_category_chemoprevention = InterventionCategory.objects.create(
            name="Preventive Chemotherapy",
            account=self.account,
            created_by=self.user_1,
        )

        # Create interventions
        self.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=self.user_1,
            intervention_category=self.int_category_vaccination,
            code="rts_s",
        )
        self.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=self.user_1,
            intervention_category=self.int_category_chemoprevention,
            code="smc",
        )
        self.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=self.user_1,
            intervention_category=self.int_category_chemoprevention,
            code="iptp",
        )

        self.scenario_1 = Scenario.objects.create(
            name="Scenario 1",
            created_by=self.user_1,
            account=self.account,
            start_year=2024,
            end_year=2026,
        )
        self.rule_1 = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria={"and": [{"==": [{"var": 2}, "F"]}]},
            created_by=self.user_1,
            scenario=self.scenario_1,
            org_units_matched=[1, 2, 3],
            org_units_excluded=[],
            org_units_included=[7],
            org_units_scope=[1, 2, 3, 7],
            updated_by=self.user_1,
        )
        self.intervention_properties_1 = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.rule_1,
            intervention=self.intervention_chemo_iptp,
            coverage=0.8,
        )
        self.intervention_properties_2 = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.rule_1,
            intervention=self.intervention_vaccination_rts,
            coverage=0.8,
        )
        self.rule_2 = ScenarioRule.objects.create(
            name="Rule 2",
            priority=2,
            color="#00FF00",
            matching_criteria={"and": [{">=": [{"var": 2}, 10]}]},
            created_by=self.user_1,
            scenario=self.scenario_1,
            org_units_matched=[4, 5, 6],
            org_units_excluded=[7],
            org_units_included=[9],
            org_units_scope=[],
        )
        self.intervention_properties_3 = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.rule_2,
            intervention=self.intervention_chemo_smc,
            coverage=0.9,
        )

    def test_duplicate_rules(self):
        scenario_2 = Scenario.objects.create(
            name="Scenario 2",
            created_by=self.user_1,
            account=self.account,
            start_year=2024,
            end_year=2026,
        )

        duplicate_rules(self.scenario_1, scenario_2, self.user_2)

        # Fetch the duplicated rules for scenario_2
        duplicated_rules = ScenarioRule.objects.filter(scenario=scenario_2).order_by("priority")

        # Check that the number of duplicated rules is the same as the original
        self.assertEqual(duplicated_rules.count(), 2)

        # Check that the properties of the duplicated rules are the same as the original
        for original_rule, duplicated_rule in zip(
            ScenarioRule.objects.filter(scenario=self.scenario_1).order_by("priority"), duplicated_rules
        ):
            # Checking copied values
            self.assertEqual(original_rule.name, duplicated_rule.name)
            self.assertEqual(original_rule.priority, duplicated_rule.priority)
            self.assertEqual(original_rule.color, duplicated_rule.color)
            self.assertEqual(original_rule.matching_criteria, duplicated_rule.matching_criteria)
            self.assertEqual(original_rule.org_units_matched, duplicated_rule.org_units_matched)
            self.assertEqual(original_rule.org_units_excluded, duplicated_rule.org_units_excluded)
            self.assertEqual(original_rule.org_units_included, duplicated_rule.org_units_included)
            self.assertEqual(original_rule.org_units_scope, duplicated_rule.org_units_scope)

            # Different values
            self.assertNotEqual(original_rule.created_by, duplicated_rule.created_by)
            self.assertNotEqual(original_rule.id, duplicated_rule.id)
            self.assertNotEqual(original_rule.created_at, duplicated_rule.created_at)
            self.assertNotEqual(original_rule.updated_at, duplicated_rule.updated_at)

            # Specific values of duplicated rule
            self.assertEqual(duplicated_rule.created_by, self.user_2)
            self.assertIsNone(duplicated_rule.updated_by)

            original_intervention_properties = ScenarioRuleInterventionProperties.objects.filter(
                scenario_rule=original_rule
            ).order_by("id")
            duplicated_intervention_properties = ScenarioRuleInterventionProperties.objects.filter(
                scenario_rule=duplicated_rule
            ).order_by("id")

            self.assertEqual(original_intervention_properties.count(), duplicated_intervention_properties.count())

            for original_prop, duplicated_prop in zip(
                original_intervention_properties, duplicated_intervention_properties
            ):
                self.assertEqual(original_prop.intervention_id, duplicated_prop.intervention_id)
                self.assertEqual(original_prop.coverage, duplicated_prop.coverage)
                self.assertNotEqual(original_prop.id, duplicated_prop.id)
                self.assertNotEqual(original_prop.created_at, duplicated_prop.created_at)
                self.assertNotEqual(original_prop.updated_at, duplicated_prop.updated_at)

    def test_duplicate_scenario_no_rules(self):
        scenario_3 = Scenario.objects.create(
            name="Scenario 3",
            created_by=self.user_1,
            account=self.account,
            start_year=2024,
            end_year=2026,
        )
        new_scenario = Scenario.objects.create(
            name="New Scenario",
            created_by=self.user_1,
            account=self.account,
            start_year=2024,
            end_year=2026,
        )

        duplicate_rules(scenario_3, new_scenario, self.user_2)

        duplicated_rules = ScenarioRule.objects.filter(scenario=new_scenario)
        self.assertEqual(duplicated_rules.count(), 0)


class BuildInterventionGroupsTestCase(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="account")
        self.user = self.create_user_with_profile(username="user", account=self.account)
        self.category = InterventionCategory.objects.create(name="Cat", account=self.account, created_by=self.user)
        self.iv_a = Intervention.objects.create(
            name="A",
            code="a",
            created_by=self.user,
            intervention_category=self.category,
        )
        self.iv_b = Intervention.objects.create(
            name="B",
            code="b",
            created_by=self.user,
            intervention_category=self.category,
        )

    def _make_df(self, rows):
        return pd.DataFrame(rows)

    def _interventions_qs(self):
        return Intervention.objects.filter(intervention_category__account=self.account).values("id", "name", "code")

    def test_single_group(self):
        col_a = get_intervention_column("A", "a")
        col_b = get_intervention_column("B", "b")
        df = self._make_df(
            [
                {"org_unit_id": 1, col_a: 1, col_b: 1},
                {"org_unit_id": 2, col_a: 1, col_b: 1},
            ]
        )
        groups = _build_intervention_groups(df, self._interventions_qs())
        self.assertEqual(len(groups), 1)
        self.assertEqual(groups[0]["intervention_ids"], frozenset([self.iv_a.id, self.iv_b.id]))
        self.assertCountEqual(groups[0]["org_unit_ids"], [1, 2])

    def test_multiple_groups(self):
        col_a = get_intervention_column("A", "a")
        col_b = get_intervention_column("B", "b")
        df = self._make_df(
            [
                {"org_unit_id": 1, col_a: 1, col_b: 0},
                {"org_unit_id": 2, col_a: 0, col_b: 1},
                {"org_unit_id": 3, col_a: 1, col_b: 0},
            ]
        )
        groups = _build_intervention_groups(df, self._interventions_qs())
        self.assertEqual(len(groups), 2)
        group_a = next(g for g in groups if g["intervention_ids"] == frozenset([self.iv_a.id]))
        group_b = next(g for g in groups if g["intervention_ids"] == frozenset([self.iv_b.id]))
        self.assertCountEqual(group_a["org_unit_ids"], [1, 3])
        self.assertEqual(group_b["org_unit_ids"], [2])

    def test_no_assignments_returns_empty(self):
        col_a = get_intervention_column("A", "a")
        col_b = get_intervention_column("B", "b")
        df = self._make_df(
            [
                {"org_unit_id": 1, col_a: 0, col_b: 0},
            ]
        )
        groups = _build_intervention_groups(df, self._interventions_qs())
        self.assertEqual(len(groups), 0)


class CreateRulesFromImportTestCase(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="account")
        self.user = self.create_user_with_profile(username="user", account=self.account)
        project = Project.objects.create(name="Project", app_id="APP", account=self.account)
        sw_source = DataSource.objects.create(name="ds")
        sw_source.projects.add(project)
        self.version = SourceVersion.objects.create(data_source=sw_source, number=1)
        self.account.default_version = self.version
        self.account.save()

        self.category = InterventionCategory.objects.create(name="Cat", account=self.account, created_by=self.user)
        self.iv_a = Intervention.objects.create(
            name="Alpha",
            short_name="A",
            code="a",
            created_by=self.user,
            intervention_category=self.category,
        )
        self.iv_b = Intervention.objects.create(
            name="Beta",
            short_name="B",
            code="b",
            created_by=self.user,
            intervention_category=self.category,
        )

        out = OrgUnitType.objects.create(name="DISTRICT")
        self.ou1 = OrgUnit.objects.create(
            org_unit_type=out,
            name="OU1",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=Point(1, 1, 0),
        )
        self.ou2 = OrgUnit.objects.create(
            org_unit_type=out,
            name="OU2",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=Point(2, 2, 0),
        )
        self.ou3 = OrgUnit.objects.create(
            org_unit_type=out,
            name="OU3",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=Point(3, 3, 0),
        )

        metric_type = MetricType.objects.create(account=self.account, name="Population", code="POP", units="people")
        for org_unit in [self.ou1, self.ou2, self.ou3]:
            MetricValue.objects.create(metric_type=metric_type, org_unit=org_unit, value=1000, year=2025)

        self.scenario = Scenario.objects.create(
            name="Import Scenario",
            created_by=self.user,
            account=self.account,
            start_year=2024,
            end_year=2026,
        )
        self.all_ou_ids = {self.ou1.id, self.ou2.id, self.ou3.id}
        self.col_a = get_intervention_column("Alpha", "a")
        self.col_b = get_intervention_column("Beta", "b")

    def _interventions_qs(self):
        return Intervention.objects.filter(intervention_category__account=self.account).values("id", "name", "code")

    def test_all_minority_groups(self):
        """Each district has a unique intervention → all minority → inclusion-only rules."""
        df = pd.DataFrame(
            [
                {"org_unit_id": self.ou1.id, self.col_a: 1, self.col_b: 0},
                {"org_unit_id": self.ou2.id, self.col_a: 0, self.col_b: 1},
                {"org_unit_id": self.ou3.id, self.col_a: 1, self.col_b: 1},
            ]
        )
        rules = create_rules_from_import(
            self.scenario,
            df,
            self._interventions_qs(),
            self.all_ou_ids,
            self.user,
        )
        self.assertEqual(len(rules), 3)
        for rule in rules:
            self.assertIsNone(rule.matching_criteria)
            self.assertEqual(rule.org_units_excluded, [])
            self.assertNotEqual(rule.org_units_included, [])
            self.assertTrue(rule.intervention_properties.exists())
            for ip in rule.intervention_properties.all():
                self.assertEqual(ip.coverage, DEFAULT_IMPORT_COVERAGE)

    def test_majority_group_gets_match_all(self):
        """Group covering >50% of org units gets a 'Match all' rule with exclusions."""
        df = pd.DataFrame(
            [
                {"org_unit_id": self.ou1.id, self.col_a: 1, self.col_b: 0},
                {"org_unit_id": self.ou2.id, self.col_a: 1, self.col_b: 0},
                {"org_unit_id": self.ou3.id, self.col_a: 0, self.col_b: 1},
            ]
        )
        rules = create_rules_from_import(
            self.scenario,
            df,
            self._interventions_qs(),
            self.all_ou_ids,
            self.user,
        )
        self.assertEqual(len(rules), 2)

        majority_rule = next(r for r in rules if r.matching_criteria == {"all": True})
        minority_rule = next(r for r in rules if r.matching_criteria is None)

        self.assertEqual(sorted(majority_rule.org_units_excluded), [self.ou3.id])
        self.assertEqual(majority_rule.org_units_included, [])
        iv_ids = set(majority_rule.intervention_properties.values_list("intervention_id", flat=True))
        self.assertEqual(iv_ids, {self.iv_a.id})

        self.assertEqual(minority_rule.org_units_included, [self.ou3.id])
        self.assertEqual(minority_rule.org_units_excluded, [])
        iv_ids = set(minority_rule.intervention_properties.values_list("intervention_id", flat=True))
        self.assertEqual(iv_ids, {self.iv_b.id})

    def test_distinct_colors(self):
        df = pd.DataFrame(
            [
                {"org_unit_id": self.ou1.id, self.col_a: 1, self.col_b: 0},
                {"org_unit_id": self.ou2.id, self.col_a: 0, self.col_b: 1},
                {"org_unit_id": self.ou3.id, self.col_a: 1, self.col_b: 1},
            ]
        )
        rules = create_rules_from_import(
            self.scenario,
            df,
            self._interventions_qs(),
            self.all_ou_ids,
            self.user,
        )
        colors = [r.color for r in rules]
        self.assertEqual(len(colors), len(set(colors)))

    def test_rule_names(self):
        df = pd.DataFrame(
            [
                {"org_unit_id": self.ou1.id, self.col_a: 1, self.col_b: 1},
                {"org_unit_id": self.ou2.id, self.col_a: 1, self.col_b: 1},
                {"org_unit_id": self.ou3.id, self.col_a: 0, self.col_b: 1},
            ]
        )
        rules = create_rules_from_import(
            self.scenario,
            df,
            self._interventions_qs(),
            self.all_ou_ids,
            self.user,
        )
        combo_rule = next(r for r in rules if r.intervention_properties.count() == 2)
        self.assertEqual(combo_rule.name, "")

        single_rule = next(r for r in rules if r.intervention_properties.count() == 1)
        self.assertEqual(single_rule.name, "")

    def test_empty_df_returns_no_rules(self):
        df = pd.DataFrame(
            [
                {"org_unit_id": self.ou1.id, self.col_a: 0, self.col_b: 0},
            ]
        )
        rules = create_rules_from_import(
            self.scenario,
            df,
            self._interventions_qs(),
            self.all_ou_ids,
            self.user,
        )
        self.assertEqual(len(rules), 0)

    def test_refresh_assignments_after_import(self):
        """After creating rules, refresh_assignments should produce correct InterventionAssignments."""
        df = pd.DataFrame(
            [
                {"org_unit_id": self.ou1.id, self.col_a: 1, self.col_b: 0},
                {"org_unit_id": self.ou2.id, self.col_a: 1, self.col_b: 0},
                {"org_unit_id": self.ou3.id, self.col_a: 0, self.col_b: 1},
            ]
        )
        create_rules_from_import(
            self.scenario,
            df,
            self._interventions_qs(),
            self.all_ou_ids,
            self.user,
        )
        self.scenario.refresh_assignments(self.user)

        assignments = InterventionAssignment.objects.filter(scenario=self.scenario)
        self.assertEqual(assignments.count(), 3)

        a1 = assignments.get(org_unit=self.ou1)
        self.assertEqual(a1.intervention, self.iv_a)
        self.assertIsNotNone(a1.rule)

        a2 = assignments.get(org_unit=self.ou2)
        self.assertEqual(a2.intervention, self.iv_a)

        a3 = assignments.get(org_unit=self.ou3)
        self.assertEqual(a3.intervention, self.iv_b)


class GetDispersedColorTestCase(TestCase):
    def test_returns_valid_hex(self):
        for i in range(10):
            color = _get_dispersed_color(i)
            self.assertTrue(color.startswith("#"))
            self.assertEqual(len(color), 7)

    def test_wraps_around(self):
        from plugins.snt_malaria.api.scenarios.utils import DISPERSED_COLOR_ORDER

        color_0 = _get_dispersed_color(0)
        color_wrap = _get_dispersed_color(len(DISPERSED_COLOR_ORDER))
        self.assertEqual(color_0, color_wrap)
