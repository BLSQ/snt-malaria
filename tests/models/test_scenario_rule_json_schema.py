from decimal import Decimal

import jsonschema

from jsonschema import ValidationError

from iaso.test import TestCase
from plugins.snt_malaria.models.scenario import SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA


class ScenarioRuleMatchingCriteriaJsonValidationTests(TestCase):
    def test_valid_matching_criteria(self):
        valid_criteria = {
            "and": [
                {"==": [{"var": 2}, "F"]},
                {"<": [{"var": 4}, 25]},
                {"<=": [{"var": 3}, True]},
                {">": [{"var": 5}, False]},
                {">=": [{"var": 6}, 10.25]},
                {"==": [{"var": 7}, "10.25"]},
                {"<": [{"var": 8}, Decimal("10.25")]},
            ]
        }
        jsonschema.validate(valid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)
        # no exception is raised, the function does not return anything
        self.assertTrue(True)

    def test_invalid_base_operator(self):
        invalid_criteria = {
            "or": [  # has to be "and"
                {"==": [{"var": 2}, "F"]},
                {"<": [{"var": 4}, 25]},
            ]
        }
        with self.assertRaisesMessage(ValidationError, "and"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_invalid_format_list(self):
        invalid_criteria = [{"==": [{"var": 1}, "F"]}, {"<": [{"var": 2}, 25]}]  # missing wrapped "and" object
        with self.assertRaisesMessage(ValidationError, "is not of type 'object'"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_invalid_missing_conditions_list(self):
        invalid_criteria = {
            "and": {"==": [{"var": 2}, "F"]}  # should be a list of conditions, not a single condition
        }
        with self.assertRaisesMessage(ValidationError, "is not of type 'array'"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_invalid_empty_conditions_list(self):
        invalid_criteria = {
            "and": []  # should have at least one condition
        }
        with self.assertRaisesMessage(ValidationError, "is too short"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_invalid_condition_operator(self):
        invalid_criteria = {
            "and": [
                {"!=": [{"var": 2}, "F"]}  # operator should be one of ==, <=, >=, <, >
            ]
        }
        with self.assertRaisesMessage(ValidationError, "^(==|<=|>=|<|>)$"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_invalid_condition_missing_list_of_operands(self):
        invalid_criteria = {
            "and": [
                {"==": {"var": 2}}  # operands should be a list, not an object
            ]
        }
        with self.assertRaisesMessage(ValidationError, "is not of type 'array'"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_invalid_condition_operand_missing_var(self):
        invalid_criteria = {
            "and": [
                {"==": [{"value": 2}, "F"]}  # missing "var" key in first operand
            ]
        }
        with self.assertRaisesMessage(ValidationError, "'var' is a required property"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_invalid_condition_missing_right_operand(self):
        invalid_criteria = {
            "and": [
                {"==": [{"var": 2}]}  # should have exactly two operands
            ]
        }
        with self.assertRaisesMessage(ValidationError, "is too short"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_invalid_condition_extra_operand(self):
        invalid_criteria = {
            "and": [
                {"==": [{"var": 2}, "F", "extra"]}  # should have exactly two operands
            ]
        }
        with self.assertRaisesMessage(ValidationError, "is too long"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_invalid_condition_var_operand_not_an_id(self):
        """
        The "var" value should be an intervention ID
        """
        invalid_criteria = {
            "and": [
                {"==": [{"var": "not_an_id"}, "F"]}  # "var" should be an integer
            ]
        }
        with self.assertRaisesMessage(ValidationError, "is not of type 'integer'"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_invalid_condition_right_operand_wrong_type(self):
        unexpected_object = {"unexpected": "object"}
        object_operand = {
            "and": [
                {"==": [{"var": 2}, unexpected_object]}  # right operand should be a string, number, or boolean
            ]
        }
        with self.assertRaisesMessage(ValidationError, f"{str(unexpected_object)} is not valid"):
            jsonschema.validate(object_operand, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

        null_operand = {"and": [{"==": [{"var": 2}, None]}]}
        with self.assertRaisesMessage(ValidationError, "None is not valid"):
            jsonschema.validate(null_operand, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

        blank_operand = {"and": [{"==": [{"var": 2}, ""]}]}
        with self.assertRaisesMessage(ValidationError, "is too short"):
            jsonschema.validate(blank_operand, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_invalid_condition_empty(self):
        invalid_criteria = {
            "and": [
                {}  # condition object should not be empty
            ]
        }
        with self.assertRaisesMessage(ValidationError, "{} does not have enough properties"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_additional_properties_at_root_level(self):
        invalid_criteria = {
            "and": [
                {"==": [{"var": 2}, "F"]},
            ],
            "unexpected_property": "unexpected_value",  # additional property at root level
        }
        with self.assertRaisesMessage(ValidationError, "Additional properties are not allowed"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_additional_properties_in_condition(self):
        invalid_criteria = {
            "and": [
                {
                    "==": [{"var": 2}, "F"],
                    "unexpected_property_in_condition": "unexpected_value",  # additional property inside condition
                }
            ]
        }
        with self.assertRaisesMessage(ValidationError, "too many properties"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)

    def test_additional_properties_in_var_object(self):
        invalid_criteria = {
            "and": [
                {
                    "==": [
                        {
                            "var": 2,
                            "unexpected_property_in_var_object": "unexpected_value",
                        },  # additional property in var object
                        "F",
                    ]
                }
            ]
        }
        with self.assertRaisesMessage(ValidationError, "Additional properties are not allowed"):
            jsonschema.validate(invalid_criteria, SCENARIO_RULE_MATCHING_CRITERIA_SCHEMA)
