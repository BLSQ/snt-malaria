from unittest.mock import MagicMock, patch

from rest_framework import status

from iaso.models.base import Account
from iaso.test import APITestCase
from plugins.snt_malaria.models import Scenario
from plugins.snt_malaria.models.impact_provider_config import ImpactProviderConfig


YEAR_RANGE_URL = "/api/snt_malaria/impact_year_range/"
AGE_GROUPS_URL = "/api/snt_malaria/impact_age_groups/"
IMPACT_URL = "/api/snt_malaria/impact/"


class ImpactViewsBaseTestCase(APITestCase):
    """Shared setup for all impact viewset tests."""

    def setUp(self):
        self.account = Account.objects.create(name="Impact Test Account")
        self.user = self.create_user_with_profile(username="impact_user", account=self.account)

        self.other_account = Account.objects.create(name="Other Account")
        self.other_user = self.create_user_with_profile(username="other_user", account=self.other_account)

        ImpactProviderConfig.objects.create(account=self.account, provider_key="swisstph")

        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user,
            name="Test Scenario",
            start_year=2025,
            end_year=2027,
        )


class ImpactYearRangeViewTests(ImpactViewsBaseTestCase):
    def test_unauthenticated(self):
        response = self.client.get(YEAR_RANGE_URL)
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    @patch("plugins.snt_malaria.api.impact.views.get_provider_for_account")
    def test_authenticated_with_provider(self, mock_get_provider):
        mock_provider = MagicMock()
        mock_provider.get_year_range.return_value = (2020, 2030)
        mock_get_provider.return_value = mock_provider

        self.client.force_authenticate(user=self.user)
        result = self.assertJSONResponse(self.client.get(YEAR_RANGE_URL), status.HTTP_200_OK)
        self.assertEqual(result["min_year"], 2020)
        self.assertEqual(result["max_year"], 2030)

    @patch("plugins.snt_malaria.api.impact.views.get_provider_for_account")
    def test_no_provider_configured(self, mock_get_provider):
        mock_get_provider.return_value = None

        self.client.force_authenticate(user=self.user)
        self.assertJSONResponse(self.client.get(YEAR_RANGE_URL), status.HTTP_404_NOT_FOUND)


class ImpactAgeGroupsViewTests(ImpactViewsBaseTestCase):
    def test_unauthenticated(self):
        response = self.client.get(AGE_GROUPS_URL)
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    @patch("plugins.snt_malaria.api.impact.views.get_provider_for_account")
    def test_authenticated_with_provider(self, mock_get_provider):
        mock_provider = MagicMock()
        mock_provider.get_age_groups.return_value = ["allAges", "under5"]
        mock_get_provider.return_value = mock_provider

        self.client.force_authenticate(user=self.user)
        result = self.assertJSONResponse(self.client.get(AGE_GROUPS_URL), status.HTTP_200_OK)
        self.assertEqual(result["age_groups"], ["allAges", "under5"])

    @patch("plugins.snt_malaria.api.impact.views.get_provider_for_account")
    def test_no_provider_configured(self, mock_get_provider):
        mock_get_provider.return_value = None

        self.client.force_authenticate(user=self.user)
        self.assertJSONResponse(self.client.get(AGE_GROUPS_URL), status.HTTP_404_NOT_FOUND)


class ImpactViewTests(ImpactViewsBaseTestCase):
    def test_unauthenticated(self):
        response = self.client.get(IMPACT_URL)
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    @patch("plugins.snt_malaria.api.impact.views.get_provider_for_account")
    def test_no_provider_configured(self, mock_get_provider):
        mock_get_provider.return_value = None

        self.client.force_authenticate(user=self.user)
        self.assertJSONResponse(self.client.get(IMPACT_URL), status.HTTP_404_NOT_FOUND)

    @patch("plugins.snt_malaria.api.impact.views.get_provider_for_account")
    def test_missing_required_params(self, mock_get_provider):
        mock_get_provider.return_value = MagicMock()

        self.client.force_authenticate(user=self.user)
        result = self.assertJSONResponse(self.client.get(IMPACT_URL), status.HTTP_400_BAD_REQUEST)
        self.assertIn("scenario_id", result)
        self.assertIn("age_group", result)

    @patch("plugins.snt_malaria.api.impact.views.get_provider_for_account")
    def test_scenario_from_other_account_rejected(self, mock_get_provider):
        mock_get_provider.return_value = MagicMock()

        other_scenario = Scenario.objects.create(
            account=self.other_account,
            created_by=self.other_user,
            name="Other Scenario",
            start_year=2025,
            end_year=2027,
        )

        self.client.force_authenticate(user=self.user)
        result = self.assertJSONResponse(
            self.client.get(IMPACT_URL, {"scenario_id": other_scenario.id, "age_group": "under5"}),
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("scenario_id", result)

    @patch("plugins.snt_malaria.api.impact.views.get_provider_for_account")
    def test_non_existing_scenario(self, mock_get_provider):
        mock_get_provider.return_value = MagicMock()

        self.client.force_authenticate(user=self.user)
        result = self.assertJSONResponse(
            self.client.get(IMPACT_URL, {"scenario_id": 999999, "age_group": "under5"}),
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("scenario_id", result)

    @patch("plugins.snt_malaria.api.impact.views.get_provider_for_account")
    def test_year_from_not_integer(self, mock_get_provider):
        mock_get_provider.return_value = MagicMock()

        self.client.force_authenticate(user=self.user)
        result = self.assertJSONResponse(
            self.client.get(IMPACT_URL, {"scenario_id": self.scenario.id, "age_group": "under5", "year_from": "abc"}),
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("year_from", result)

    @patch("plugins.snt_malaria.api.impact.views.get_provider_for_account")
    def test_year_to_not_integer(self, mock_get_provider):
        mock_get_provider.return_value = MagicMock()

        self.client.force_authenticate(user=self.user)
        result = self.assertJSONResponse(
            self.client.get(IMPACT_URL, {"scenario_id": self.scenario.id, "age_group": "under5", "year_to": "xyz"}),
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("year_to", result)

    @patch("plugins.snt_malaria.api.impact.views.get_provider_for_account")
    def test_missing_age_group(self, mock_get_provider):
        mock_get_provider.return_value = MagicMock()

        self.client.force_authenticate(user=self.user)
        result = self.assertJSONResponse(
            self.client.get(IMPACT_URL, {"scenario_id": self.scenario.id}),
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("age_group", result)

    @patch("plugins.snt_malaria.api.impact.views.get_provider_for_account")
    def test_empty_age_group(self, mock_get_provider):
        mock_get_provider.return_value = MagicMock()

        self.client.force_authenticate(user=self.user)
        result = self.assertJSONResponse(
            self.client.get(IMPACT_URL, {"scenario_id": self.scenario.id, "age_group": ""}),
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("age_group", result)
