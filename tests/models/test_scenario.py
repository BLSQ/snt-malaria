from iaso.models import Account, OrgUnit
from iaso.test import TestCase
from plugins.snt_malaria.models import Scenario, ScenarioRule


class ScenarioModelTestCase(TestCase):
    def setUp(self):
        self.account = Account.objects.create(name="account")
        self.user = self.create_user_with_profile(username="user", account=self.account)
        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name="Scenario 1",
            description="Description of scenario 1",
            start_year=2020,
            end_year=2030,
        )
        self.org_unit_1 = OrgUnit.objects.create(name="Org Unit 1")
        self.org_unit_2 = OrgUnit.objects.create(name="Org Unit 2")
        self.matching_criteria = {
            "and": [{"==": [{"var": 1}, "F"]}, {"<": [{"var": 2}, 25]}, {"<=": [{"var": 3}, True]}]
        }
        self.scenario_rule_1 = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
        )
        self.scenario_rule_2 = ScenarioRule.objects.create(
            name="Rule 2",
            priority=2,
            color="#00FF00",
            matching_criteria=self.matching_criteria,
            created_by=self.user,
            scenario=self.scenario,
        )

    def test_get_next_available_priority(self):
        next_priority = self.scenario.get_next_available_priority()
        self.assertEqual(next_priority, 3)

    def test_get_next_available_priority_no_rules(self):
        new_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name="Scenario 2",
            description="Description of scenario 2",
            start_year=2020,
            end_year=2030,
        )
        next_priority = new_scenario.get_next_available_priority()
        self.assertEqual(next_priority, 1)
