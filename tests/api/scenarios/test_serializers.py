from rest_framework.test import APIRequestFactory

from iaso.models import Account
from iaso.test import TestCase
from plugins.snt_malaria.api.scenarios.serializers import DuplicateScenarioSerializer
from plugins.snt_malaria.models import Scenario
from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION


class DuplicateScenarioSerializerTestCase(TestCase):
    def setUp(cls):
        cls.account = Account.objects.create(name="Test Account")
        cls.user_with_basic_perm = cls.create_user_with_profile(
            username="testuserbasic", account=cls.account, permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION]
        )
        cls.scenario = Scenario.objects.create(
            account=cls.account,
            created_by=cls.user_with_basic_perm,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2026,
        )

    def test_ok(self):
        request = APIRequestFactory().get("/")
        request.user = self.user_with_basic_perm
        serializer = DuplicateScenarioSerializer(
            data={"id_to_duplicate": self.scenario.id}, context={"request": request}
        )
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["id_to_duplicate"], self.scenario.id)

    def test_missing_id(self):
        serializer = DuplicateScenarioSerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("id_to_duplicate", serializer.errors)
        self.assertIn("This field is required.", serializer.errors["id_to_duplicate"])
