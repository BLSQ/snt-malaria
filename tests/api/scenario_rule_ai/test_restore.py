from rest_framework import status

from iaso.models import Account, MetricType
from plugins.snt_malaria.models import ScenarioRule
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


RESTORE_URL = "/api/snt_malaria/scenario_rule_ai/restore/"


class ScenarioRuleAIRestoreAPITestCase(SNTMalariaAPITestCase):
    """The transcript's "revert" action: POST the complete rule set as it stood before an AI turn,
    and it's re-persisted through the same pipeline the generate endpoint uses."""

    auto_create_account = False

    def setUp(self):
        super().setUp()

        self.account = Account.objects.create(name="Test Account", anthropic_api_key="sk-test-key")
        self.user = self.create_user_with_profile(
            username="restore_user", account=self.account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )
        self.user_no_perm = self.create_user_with_profile(
            username="restore_user_no_perm", account=self.account, permissions=[]
        )
        self.scenario = self.create_snt_scenario(account=self.account, created_by=self.user, name="Test Scenario")

        self.metric_type = MetricType.objects.create(account=self.account, name="Incidence", code="incidence")

        self.int_category = self.create_snt_intervention_category(
            account=self.account, created_by=self.user, name="Vector control"
        )
        self.intervention = self.create_snt_intervention(
            intervention_category=self.int_category, created_by=self.user, name="Bednets", code="bednets"
        )
        self.other_intervention = self.create_snt_intervention(
            intervention_category=self.int_category, created_by=self.user, name="IRS", code="irs"
        )

    def _create_rule(self, name, priority, *, value=100, color="#b71c1c", interventions=None):
        rule = ScenarioRule.objects.create(
            name=name,
            priority=priority,
            scenario=self.scenario,
            created_by=self.user,
            color=color,
            matching_criteria={"and": [{">": [{"var": self.metric_type.id}, value]}]},
            org_units_matched=[],
        )
        rule.interventions.set(interventions or [self.intervention])
        return rule

    def _spec(self, *, id=None, name="Rule", value=100, color="#b71c1c", interventions=None):
        return {
            "id": id,
            "name": name,
            "is_match_all": False,
            "matching_criteria": [{"metric_type": self.metric_type.id, "operator": ">", "value": value}],
            "interventions": interventions if interventions is not None else [self.intervention.id],
            "color": color,
        }

    def _post(self, rules, scenario=None):
        return self.client.post(
            RESTORE_URL,
            {"scenario": (scenario or self.scenario).id, "rules": rules},
            format="json",
        )

    def test_unauthenticated_returns_401(self):
        response = self._post([self._spec()])
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_without_permission_returns_403(self):
        self.client.force_authenticate(self.user_no_perm)
        response = self._post([self._spec()])
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_locked_scenario_returns_400(self):
        self.scenario.is_locked = True
        self.scenario.save()
        self.client.force_authenticate(self.user)

        response = self._post([self._spec()])

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_restore_recreates_the_snapshot_rule_set_exactly(self):
        keep = self._create_rule("Original A", priority=1, value=100, color="#b71c1c")
        self._create_rule("Original B", priority=2, value=200, color="#ef5350")
        snapshot = [
            self._spec(id=keep.id, name="Original A", value=100, color="#b71c1c"),
            self._spec(id=None, name="Original B", value=200, color="#ef5350"),
        ]

        # Simulate an AI turn wiping the set down to a single, different rule.
        ScenarioRule.objects.filter(scenario=self.scenario).delete()
        self._create_rule("AI rule", priority=1, value=999, color="#42a5f5")

        self.client.force_authenticate(self.user)
        response = self._post(snapshot)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rules = list(ScenarioRule.objects.filter(scenario=self.scenario).order_by("priority"))
        self.assertEqual([r.name for r in rules], ["Original A", "Original B"])
        self.assertEqual([r.priority for r in rules], [1, 2])
        self.assertEqual([r.color.lower() for r in rules], ["#b71c1c", "#ef5350"])
        self.assertEqual(rules[1].matching_criteria, {"and": [{">": [{"var": self.metric_type.id}, 200]}]})
        self.assertEqual(list(rules[0].interventions.values_list("id", flat=True)), [self.intervention.id])

    def test_restore_reprioritizes_in_list_order(self):
        self.client.force_authenticate(self.user)
        response = self._post(
            [
                self._spec(name="First", value=10),
                self._spec(name="Second", value=20),
                self._spec(name="Third", value=30),
            ]
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        by_priority = list(
            ScenarioRule.objects.filter(scenario=self.scenario).order_by("priority").values_list("name", flat=True)
        )
        self.assertEqual(by_priority, ["First", "Second", "Third"])

    def test_snapshot_rule_id_that_no_longer_exists_is_recreated(self):
        self.client.force_authenticate(self.user)

        response = self._post([self._spec(id=999_999, name="Ghost rule")])

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rule = ScenarioRule.objects.get(scenario=self.scenario)
        self.assertEqual(rule.name, "Ghost rule")
        self.assertEqual(rule.priority, 1)

    def test_snapshot_referencing_a_deleted_intervention_is_rejected_and_rules_kept(self):
        existing = self._create_rule("Untouched", priority=1)
        self.client.force_authenticate(self.user)

        response = self._post([self._spec(id=existing.id, interventions=[999_999])])

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ScenarioRule.objects.filter(scenario=self.scenario).count(), 1)
        existing.refresh_from_db()
        self.assertEqual(existing.name, "Untouched")

    def test_response_returns_the_restored_rules(self):
        self.client.force_authenticate(self.user)
        response = self._post([self._spec(name="Restored")])

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["rules"]), 1)
        self.assertEqual(response.data["rules"][0]["name"], "Restored")
