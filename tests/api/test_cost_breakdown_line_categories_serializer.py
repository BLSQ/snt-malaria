from iaso.api.common import DropdownOptionsWithRepresentationSerializer
from iaso.models.base import Account
from iaso.test import APITestCase


class InterventionCostBreakdownLineSerializerTests(APITestCase):
    def setUp(cls):
        cls.account = Account.objects.create(name="Test Account")
        cls.user = cls.create_user_with_profile(username="testuser", account=cls.account)

    def test_to_representation(self):
        serializer = DropdownOptionsWithRepresentationSerializer()
        data = serializer.to_representation(("Procurement", "Procurement"))
        self.assertEqual(data, {"value": "Procurement", "label": "Procurement"})
