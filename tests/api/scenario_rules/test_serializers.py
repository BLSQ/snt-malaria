from unittest.mock import Mock

from plugins.snt_malaria.api.scenario_rules.serializers import (
    ScenarioRuleCreateSerializer,
    ScenarioRuleListSerializer,
    ScenarioRuleQuerySerializer,
    ScenarioRuleRetrieveSerializer,
    ScenarioRuleUpdateSerializer,
)
from plugins.snt_malaria.models import ScenarioRule
from plugins.snt_malaria.tests.api.scenario_rules.common_base import ScenarioRulesTestBase


class ScenarioRuleQuerySerializerTestCase(ScenarioRulesTestBase):
    def setUp(self):
        super().setUp()
        self.context = {"request": Mock(user=self.user_with_full_perm)}

    def test_happy_path(self):
        data = {
            "scenario": self.scenario.id,
        }
        serializer = ScenarioRuleQuerySerializer(data=data, context=self.context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["scenario"], self.scenario)

    def test_unknown_scenario(self):
        data = {
            "scenario": 9999,
        }
        serializer = ScenarioRuleQuerySerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertIn(f'Invalid pk "{data["scenario"]}"', serializer.errors["scenario"][0])

    def test_scenario_from_another_account(self):
        data = {
            "scenario": self.other_scenario.id,
        }
        serializer = ScenarioRuleQuerySerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertIn(f'Invalid pk "{data["scenario"]}"', serializer.errors["scenario"][0])

    def test_missing_scenario_field(self):
        data = {}
        serializer = ScenarioRuleQuerySerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertIn("This field is required.", serializer.errors["scenario"][0])

    def test_blank_scenario_field(self):
        data = {"scenario": ""}
        serializer = ScenarioRuleQuerySerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertIn("This field may not be null.", serializer.errors["scenario"][0])


class ScenarioRuleListSerializerTestCase(ScenarioRulesTestBase):
    def test_happy_path(self):
        queryset = ScenarioRule.objects.filter(scenario=self.scenario).order_by("id")
        serializer = ScenarioRuleListSerializer(queryset, many=True)
        data = serializer.data
        self.assertEqual(len(data), 2)

        rule = data[0]
        self.assertEqual(rule["id"], self.scenario_rule_1.id)
        self.assertEqual(rule["scenario"], self.scenario.id)
        self.assertEqual(rule["name"], self.scenario_rule_1.name)
        self.assertEqual(rule["priority"], self.scenario_rule_1.priority)
        self.assertEqual(rule["color"], self.scenario_rule_1.color)
        self.assertEqual(rule["matching_criteria"], self.scenario_rule_1.matching_criteria)
        self.assertEqual(rule["org_units_matched"], self.scenario_rule_1.org_units_matched)
        self.assertEqual(rule["org_units_excluded"], self.scenario_rule_1.org_units_excluded)
        self.assertEqual(rule["org_units_included"], self.scenario_rule_1.org_units_included)
        self.assertEqual(rule["org_units_scope"], self.scenario_rule_1.org_units_scope)
        self.assertEqual(
            rule["intervention_properties"],
            [
                {
                    "intervention": self.rule_intervention_1.intervention.id,
                    "category": self.rule_intervention_1.intervention.intervention_category_id,
                    "coverage": f"{self.rule_intervention_1.coverage:.2f}",
                },
                {
                    "intervention": self.rule_intervention_2.intervention.id,
                    "category": self.rule_intervention_2.intervention.intervention_category_id,
                    "coverage": f"{self.rule_intervention_2.coverage:.2f}",
                },
            ],
        )

        rule_2 = data[1]
        self.assertEqual(rule_2["id"], self.scenario_rule_2.id)
        self.assertEqual(rule_2["scenario"], self.scenario.id)
        self.assertEqual(rule_2["name"], self.scenario_rule_2.name)
        self.assertEqual(rule_2["priority"], self.scenario_rule_2.priority)
        self.assertEqual(rule_2["color"], self.scenario_rule_2.color)
        self.assertEqual(rule_2["matching_criteria"], self.scenario_rule_2.matching_criteria)
        self.assertEqual(rule_2["org_units_matched"], self.scenario_rule_2.org_units_matched)
        self.assertEqual(rule_2["org_units_excluded"], self.scenario_rule_2.org_units_excluded)
        self.assertEqual(rule_2["org_units_included"], self.scenario_rule_2.org_units_included)
        self.assertEqual(rule_2["org_units_scope"], self.scenario_rule_2.org_units_scope)
        self.assertEqual(
            rule_2["intervention_properties"],
            [
                {
                    "intervention": self.rule_intervention_3.intervention.id,
                    "category": self.rule_intervention_3.intervention.intervention_category_id,
                    "coverage": f"{self.rule_intervention_3.coverage:.2f}",
                },
            ],
        )


class ScenarioRuleRetrieveSerializerTestCase(ScenarioRulesTestBase):
    def test_happy_path(self):
        serializer = ScenarioRuleRetrieveSerializer(instance=self.scenario_rule_1)
        data = serializer.data
        self.assertEqual(data["id"], self.scenario_rule_1.id)
        self.assertEqual(data["scenario"], self.scenario_rule_1.scenario.id)
        self.assertEqual(data["name"], self.scenario_rule_1.name)
        self.assertEqual(data["priority"], self.scenario_rule_1.priority)
        self.assertEqual(data["color"], self.scenario_rule_1.color)
        self.assertEqual(data["matching_criteria"], self.scenario_rule_1.matching_criteria)
        self.assertEqual(data["org_units_matched"], self.scenario_rule_1.org_units_matched)
        self.assertEqual(data["org_units_excluded"], self.scenario_rule_1.org_units_excluded)
        self.assertEqual(data["org_units_included"], self.scenario_rule_1.org_units_included)
        self.assertEqual(data["org_units_scope"], self.scenario_rule_1.org_units_scope)
        self.assertEqual(
            data["intervention_properties"],
            [
                {
                    "intervention": self.rule_intervention_1.intervention.id,
                    "category": self.rule_intervention_1.intervention.intervention_category_id,
                    "coverage": f"{self.rule_intervention_1.coverage:.2f}",
                },
                {
                    "intervention": self.rule_intervention_2.intervention.id,
                    "category": self.rule_intervention_2.intervention.intervention_category_id,
                    "coverage": f"{self.rule_intervention_2.coverage:.2f}",
                },
            ],
        )
        self.assertEqual(data["created_by"], self.scenario_rule_1.created_by_id)
        self.assertIsNone(data["updated_by"])
        # don't care about the timestamp value, just want to know that it's there
        self.assertIsNotNone(data["created_at"])
        self.assertIsNotNone(data["updated_at"])


class ScenarioRuleCreateSerializerTestCase(ScenarioRulesTestBase):
    def setUp(self):
        super().setUp()
        self.context = {"request": Mock(user=self.user_with_full_perm)}

    def test_happy_path(self):
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_population.id}, 1000]}]},
            "org_units_excluded": [self.district_1.id],
            "org_units_included": [self.district_2.id],
            "org_units_scope": [self.district_3.id],
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
                {
                    "intervention": self.intervention_vaccination_rts.id,
                    "coverage": 0.50,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        scenario_rule = serializer.save(created_by=self.user_with_full_perm)
        # asserts on simple fields
        self.assertEqual(scenario_rule.scenario, self.scenario)
        self.assertEqual(scenario_rule.name, data["name"])
        self.assertEqual(scenario_rule.color, data["color"])
        self.assertEqual(scenario_rule.matching_criteria, data["matching_criteria"])
        self.assertEqual(scenario_rule.org_units_excluded, data["org_units_excluded"])
        self.assertEqual(scenario_rule.org_units_included, data["org_units_included"])
        self.assertEqual(scenario_rule.org_units_scope, data["org_units_scope"])

        # Making sure that the intervention properties were created correctly
        self.assertEqual(scenario_rule.intervention_properties.count(), 2)
        intervention_property_1 = scenario_rule.intervention_properties.get(intervention=self.intervention_chemo_iptp)
        self.assertEqual(intervention_property_1.coverage, 0.75)
        intervention_property_2 = scenario_rule.intervention_properties.get(
            intervention=self.intervention_vaccination_rts
        )
        self.assertEqual(intervention_property_2.coverage, 0.50)

        # asserts on computed fields
        self.assertEqual(scenario_rule.priority, 3)  # 2 rules in setup, so the new one should be 3
        self.assertEqual(scenario_rule.org_units_matched, [])  # this comes from the view, not the serializer
        self.assertIsNotNone(scenario_rule.created_at)
        self.assertIsNotNone(scenario_rule.updated_at)

    def test_missing_required_fields(self):
        serializer = ScenarioRuleCreateSerializer(data={}, context=self.context)
        self.assertFalse(serializer.is_valid())
        errors = serializer.errors
        self.assertIn("name", errors)
        self.assertIn("This field is required.", errors["name"][0])
        self.assertIn("scenario", errors)
        self.assertIn("This field is required.", errors["scenario"][0])
        self.assertIn("matching_criteria", errors)
        self.assertIn("This field is required.", errors["matching_criteria"][0])
        self.assertIn("intervention_properties", errors)
        self.assertIn("This field is required.", errors["intervention_properties"][0])

        # optional fields
        self.assertNotIn("color", errors)
        self.assertNotIn("org_units_excluded", errors)
        self.assertNotIn("org_units_included", errors)
        self.assertNotIn("org_units_scope", errors)

    def test_invalid_matching_criteria_schema_error(self):
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"invalid_operator": [{"var": self.metric_type_population.id}, 1000]},
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("matching_criteria", serializer.errors)
        self.assertIn("is not valid under any of the given schemas", serializer.errors["matching_criteria"][0])

    def test_invalid_matching_criteria_unknown_metric_type_id(self):
        invalid_metric_type_id = 1234567890
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": invalid_metric_type_id}, 1000]}]},
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("matching_criteria", serializer.errors)
        self.assertIn(f"Invalid metric types: [{invalid_metric_type_id}]", serializer.errors["matching_criteria"][0])

    def test_invalid_matching_criteria_wrong_account_metric_type_id(self):
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {
                "and": [{"==": [{"var": self.other_metric_type_population.id}, 1000]}]
            },  # MetricType belongs to another account
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("matching_criteria", serializer.errors)
        self.assertIn(
            f"Invalid metric types: [{self.other_metric_type_population.id}]", serializer.errors["matching_criteria"][0]
        )

    def test_invalid_intervention_coverage_too_low(self):
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_population.id}, 1000]}]},
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": -0.1,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        errors = serializer.errors
        self.assertIn("intervention_properties", errors)
        intervention_errors = errors["intervention_properties"][0]
        self.assertIn("coverage", intervention_errors)
        self.assertIn("Ensure this value is greater than or equal to 0.", intervention_errors["coverage"][0])

    def test_invalid_intervention_coverage_too_high(self):
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_population.id}, 1000]}]},
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 1.1,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        errors = serializer.errors
        self.assertIn("intervention_properties", errors)
        intervention_errors = errors["intervention_properties"][0]
        self.assertIn("coverage", intervention_errors)
        self.assertIn("Ensure this value is less than or equal to 1.", intervention_errors["coverage"][0])

    def test_invalid_intervention_coverage_decimals(self):
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_population.id}, 1000]}]},
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.123,  # more than 2 decimal places
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        errors = serializer.errors
        self.assertIn("intervention_properties", errors)
        intervention_errors = errors["intervention_properties"][0]
        self.assertIn("coverage", intervention_errors)
        self.assertIn("Ensure that there are no more than 2 decimal places.", intervention_errors["coverage"][0])

    def test_invalid_org_units_excluded_unknown_org_unit_id(self):
        unknown_org_unit_id = 1234567890
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_population.id}, 1000]}]},
            "org_units_excluded": [self.district_1.id, unknown_org_unit_id],
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("org_units_excluded", serializer.errors)
        self.assertIn(f'Invalid pk "{unknown_org_unit_id}"', serializer.errors["org_units_excluded"][1][0])

    def test_invalid_org_units_excluded_wrong_account(self):
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_population.id}, 1000]}]},
            "org_units_excluded": [
                self.district_1.id,
                self.other_district_1.id,
            ],  # other_district_1 belongs to another account
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("org_units_excluded", serializer.errors)
        self.assertIn(f'Invalid pk "{self.other_district_1.id}"', serializer.errors["org_units_excluded"][1][0])

    def test_invalid_org_units_included_unknown_org_unit_id(self):
        unknown_org_unit_id = 1234567890
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_population.id}, 1000]}]},
            "org_units_included": [self.district_2.id, unknown_org_unit_id],
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("org_units_included", serializer.errors)
        self.assertIn(f'Invalid pk "{unknown_org_unit_id}"', serializer.errors["org_units_included"][1][0])

    def test_invalid_org_units_included_wrong_account(self):
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_population.id}, 1000]}]},
            "org_units_included": [
                self.district_2.id,
                self.other_district_2.id,
            ],  # other_district_2 belongs to another account
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("org_units_included", serializer.errors)
        self.assertIn(f'Invalid pk "{self.other_district_2.id}"', serializer.errors["org_units_included"][1][0])

    def test_invalid_org_units_scope_unknown_org_unit_id(self):
        unknown_org_unit_id = 1234567890
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_population.id}, 1000]}]},
            "org_units_scope": [self.district_3.id, unknown_org_unit_id],
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("org_units_scope", serializer.errors)
        self.assertIn(f'Invalid pk "{unknown_org_unit_id}"', serializer.errors["org_units_scope"][1][0])

    def test_invalid_org_units_scope_wrong_account(self):
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_population.id}, 1000]}]},
            "org_units_scope": [
                self.district_3.id,
                self.other_district_3.id,
            ],  # other_district_3 belongs to another account
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("org_units_scope", serializer.errors)
        self.assertIn(f'Invalid pk "{self.other_district_3.id}"', serializer.errors["org_units_scope"][1][0])

    def test_invalid_scenario_unknown_scenario(self):
        unknown_scenario_id = 1234567890
        data = {
            "scenario": unknown_scenario_id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_population.id}, 1000]}]},
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertIn(f'Invalid pk "{unknown_scenario_id}"', serializer.errors["scenario"][0])

    def test_invalid_scenario_wrong_account(self):
        data = {
            "scenario": self.other_scenario.id,  # other_scenario belongs to another account
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_population.id}, 1000]}]},
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("scenario", serializer.errors)
        self.assertIn(f'Invalid pk "{self.other_scenario.id}"', serializer.errors["scenario"][0])

    def test_error_duplicated_interventions(self):
        data = {
            "scenario": self.scenario.id,
            "name": "New Rule",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_population.id}, 1000]}]},
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
                {
                    "intervention": self.intervention_chemo_iptp.id,  # same intervention as above
                    "coverage": 0.50,
                },
            ],
        }
        serializer = ScenarioRuleCreateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention_properties", serializer.errors)
        self.assertIn(
            f"Duplicated interventions: [{self.intervention_chemo_iptp.id}]",
            serializer.errors["intervention_properties"][0],
        )


class ScenarioRuleUpdateSerializerTestCase(ScenarioRulesTestBase):
    def setUp(self):
        super().setUp()
        self.context = {"request": Mock(user=self.user_with_full_perm)}

    def test_happy_path(self):
        scip_ids_before = [self.rule_intervention_1.id, self.rule_intervention_2.id]
        data = {
            "name": "Updated name",
            "color": "#0000FF",
            "matching_criteria": {"and": [{"==": [{"var": self.metric_type_pop_under_5.id}, 1000]}]},
            "org_units_excluded": [self.district_1.id],
            "org_units_included": [self.district_2.id],
            "org_units_scope": [self.district_3.id],
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
                {
                    "intervention": self.intervention_vaccination_rts.id,
                    "coverage": 0.50,
                },
            ],
        }
        serializer = ScenarioRuleUpdateSerializer(instance=self.scenario_rule_1, data=data, context=self.context)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        serializer.save()
        self.scenario_rule_1.refresh_from_db()

        # asserts on simple fields
        self.assertEqual(self.scenario_rule_1.name, data["name"])
        self.assertEqual(self.scenario_rule_1.color, data["color"])
        self.assertEqual(self.scenario_rule_1.matching_criteria, data["matching_criteria"])
        self.assertEqual(self.scenario_rule_1.org_units_excluded, data["org_units_excluded"])
        self.assertEqual(self.scenario_rule_1.org_units_included, data["org_units_included"])
        self.assertEqual(self.scenario_rule_1.org_units_scope, data["org_units_scope"])

        # Making sure that the intervention properties were created correctly
        self.assertEqual(self.scenario_rule_1.intervention_properties.count(), 2)
        intervention_property_1 = self.scenario_rule_1.intervention_properties.get(
            intervention=self.intervention_chemo_iptp
        )
        self.assertEqual(intervention_property_1.coverage, 0.75)
        intervention_property_2 = self.scenario_rule_1.intervention_properties.get(
            intervention=self.intervention_vaccination_rts
        )
        self.assertEqual(intervention_property_2.coverage, 0.50)
        scip_ids_after = list(self.scenario_rule_1.intervention_properties.values_list("id", flat=True))
        self.assertNotEqual(scip_ids_after, scip_ids_before)  # objects were recreated

        # asserts on computed fields
        self.assertIsNone(self.scenario_rule_1.updated_by)  # this comes from the view
        self.assertIsNotNone(self.scenario_rule_1.created_at)
        self.assertIsNotNone(self.scenario_rule_1.updated_at)

    def test_all_optional_fields(self):
        serializer = ScenarioRuleUpdateSerializer(data={}, context=self.context)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_name_blank(self):
        data = {
            "name": "",
        }
        serializer = ScenarioRuleUpdateSerializer(instance=self.scenario_rule_1, data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)
        self.assertIn("This field may not be blank.", serializer.errors["name"][0])

    def test_name_null(self):
        data = {
            "name": None,
        }
        serializer = ScenarioRuleUpdateSerializer(instance=self.scenario_rule_1, data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)
        self.assertIn("This field may not be null.", serializer.errors["name"][0])

    def test_invalid_matching_criteria_schema_error(self):
        data = {
            "matching_criteria": {"invalid_operator": [{"var": self.metric_type_population.id}, 1000]},
        }
        serializer = ScenarioRuleUpdateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("matching_criteria", serializer.errors)
        self.assertIn("is not valid under any of the given schemas", serializer.errors["matching_criteria"][0])

    def test_invalid_matching_criteria_unknown_metric_type_id(self):
        invalid_metric_type_id = 1234567890
        data = {
            "matching_criteria": {"and": [{"==": [{"var": invalid_metric_type_id}, 1000]}]},
        }
        serializer = ScenarioRuleUpdateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("matching_criteria", serializer.errors)
        self.assertIn(f"Invalid metric types: [{invalid_metric_type_id}]", serializer.errors["matching_criteria"][0])

    def test_invalid_matching_criteria_wrong_account_metric_type_id(self):
        data = {
            "matching_criteria": {
                "and": [{"==": [{"var": self.other_metric_type_population.id}, 1000]}]
            },  # MetricType belongs to another account
        }
        serializer = ScenarioRuleUpdateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("matching_criteria", serializer.errors)
        self.assertIn(
            f"Invalid metric types: [{self.other_metric_type_population.id}]", serializer.errors["matching_criteria"][0]
        )

    def test_invalid_intervention_coverage_too_low(self):
        data = {
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": -0.1,
                },
            ],
        }
        serializer = ScenarioRuleUpdateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        errors = serializer.errors
        self.assertIn("intervention_properties", errors)
        intervention_errors = errors["intervention_properties"][0]
        self.assertIn("coverage", intervention_errors)
        self.assertIn("Ensure this value is greater than or equal to 0.", intervention_errors["coverage"][0])

    def test_invalid_intervention_coverage_too_high(self):
        data = {
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 1.1,
                },
            ],
        }
        serializer = ScenarioRuleUpdateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        errors = serializer.errors
        self.assertIn("intervention_properties", errors)
        intervention_errors = errors["intervention_properties"][0]
        self.assertIn("coverage", intervention_errors)
        self.assertIn("Ensure this value is less than or equal to 1.", intervention_errors["coverage"][0])

    def test_invalid_intervention_coverage_decimals(self):
        data = {
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.123,  # more than 2 decimal places
                },
            ],
        }
        serializer = ScenarioRuleUpdateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        errors = serializer.errors
        self.assertIn("intervention_properties", errors)
        intervention_errors = errors["intervention_properties"][0]
        self.assertIn("coverage", intervention_errors)
        self.assertIn("Ensure that there are no more than 2 decimal places.", intervention_errors["coverage"][0])

    def test_invalid_org_units_excluded_unknown_org_unit_id(self):
        unknown_org_unit_id = 1234567890
        data = {
            "org_units_excluded": [self.district_1.id, unknown_org_unit_id],
        }
        serializer = ScenarioRuleUpdateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("org_units_excluded", serializer.errors)
        self.assertIn(f'Invalid pk "{unknown_org_unit_id}"', serializer.errors["org_units_excluded"][1][0])

    def test_invalid_org_units_excluded_wrong_account(self):
        data = {
            "org_units_excluded": [
                self.district_1.id,
                self.other_district_1.id,
            ],  # other_district_1 belongs to another account
        }
        serializer = ScenarioRuleUpdateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("org_units_excluded", serializer.errors)
        self.assertIn(f'Invalid pk "{self.other_district_1.id}"', serializer.errors["org_units_excluded"][1][0])

    def test_invalid_org_units_included_unknown_org_unit_id(self):
        unknown_org_unit_id = 1234567890
        data = {
            "org_units_included": [self.district_2.id, unknown_org_unit_id],
        }
        serializer = ScenarioRuleUpdateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("org_units_included", serializer.errors)
        self.assertIn(f'Invalid pk "{unknown_org_unit_id}"', serializer.errors["org_units_included"][1][0])

    def test_invalid_org_units_included_wrong_account(self):
        data = {
            "org_units_included": [
                self.district_2.id,
                self.other_district_2.id,
            ],  # other_district_2 belongs to another account
        }
        serializer = ScenarioRuleUpdateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("org_units_included", serializer.errors)
        self.assertIn(f'Invalid pk "{self.other_district_2.id}"', serializer.errors["org_units_included"][1][0])

    def test_invalid_org_units_scope_unknown_org_unit_id(self):
        unknown_org_unit_id = 1234567890
        data = {
            "org_units_scope": [self.district_3.id, unknown_org_unit_id],
        }
        serializer = ScenarioRuleUpdateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("org_units_scope", serializer.errors)
        self.assertIn(f'Invalid pk "{unknown_org_unit_id}"', serializer.errors["org_units_scope"][1][0])

    def test_invalid_org_units_scope_wrong_account(self):
        data = {
            "org_units_scope": [
                self.district_3.id,
                self.other_district_3.id,
            ],  # other_district_3 belongs to another account
        }
        serializer = ScenarioRuleUpdateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("org_units_scope", serializer.errors)
        self.assertIn(f'Invalid pk "{self.other_district_3.id}"', serializer.errors["org_units_scope"][1][0])

    def test_error_duplicated_interventions(self):
        data = {
            "intervention_properties": [
                {
                    "intervention": self.intervention_chemo_iptp.id,
                    "coverage": 0.75,
                },
                {
                    "intervention": self.intervention_chemo_iptp.id,  # same intervention as above
                    "coverage": 0.50,
                },
            ],
        }
        serializer = ScenarioRuleUpdateSerializer(data=data, context=self.context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("intervention_properties", serializer.errors)
        self.assertIn(
            f"Duplicated interventions: [{self.intervention_chemo_iptp.id}]",
            serializer.errors["intervention_properties"][0],
        )
