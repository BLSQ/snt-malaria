from rest_framework import status

from plugins.snt_malaria.models import Donor, Grant, Scenario
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION, SNT_SETTINGS_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


class WorkspaceScopedViewSetTestCase(SNTMalariaAPITestCase):
    """The active workspace is the account's first one; rows of another workspace of the same account stay hidden."""

    DONORS_URL = "/api/snt_malaria/donors/"
    GRANTS_URL = "/api/snt_malaria/grants/"
    SCENARIOS_URL = "/api/snt_malaria/scenarios/"

    def setUp(self):
        super().setUp()
        self.writer = self.create_user_with_profile(
            username="writer",
            account=self.account,
            permissions=[SNT_SETTINGS_WRITE_PERMISSION, SNT_SCENARIO_FULL_WRITE_PERMISSION],
        )
        self.other_workspace = self.create_snt_workspace(name="Other workspace")
        self.own_donor = Donor.objects.create(workspace=self.workspace, name="Own donor")
        self.hidden_donor = Donor.objects.create(workspace=self.other_workspace, name="Hidden donor")
        self.hidden_scenario = self.create_snt_scenario(workspace=self.other_workspace, name="Hidden scenario")
        self.client.force_authenticate(self.writer)

    def test_list_excludes_rows_of_another_workspace_in_the_same_account(self):
        response = self.client.get(self.DONORS_URL)

        donors = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual([donor["id"] for donor in donors], [self.own_donor.id])

    def test_retrieve_of_another_workspace_row_returns_404(self):
        response = self.client.get(f"{self.SCENARIOS_URL}{self.hidden_scenario.id}/")

        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)

    def test_create_stores_the_active_workspace(self):
        response = self.client.post(self.DONORS_URL, {"name": "New donor"}, format="json")

        created = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        self.assertEqual(Donor.objects.get(id=created["id"]).workspace, self.workspace)

    def test_same_scenario_name_is_free_when_only_used_in_another_workspace(self):
        payload = {"name": "Hidden scenario", "start_year": 2025, "end_year": 2026}

        response = self.client.post(self.SCENARIOS_URL, payload, format="json")

        created = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.get(id=created["id"]).workspace, self.workspace)

    def test_grant_cannot_reference_a_donor_of_another_workspace(self):
        payload = {"name": "Grant", "donor": self.hidden_donor.id}

        response = self.client.post(self.GRANTS_URL, payload, format="json")

        self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Grant.objects.filter(name="Grant").exists())
