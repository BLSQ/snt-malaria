from rest_framework import status

from plugins.snt_malaria.models import InterventionCostBreakdownLine
from plugins.snt_malaria.models.cost_unit_type import CostUnitType
from plugins.snt_malaria.permissions import SNT_SETTINGS_READ_PERMISSION, SNT_SETTINGS_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


class CostUnitTypeAPITestCase(SNTMalariaAPITestCase):
    BASE_URL = "/api/snt_malaria/cost_unit_types/"
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.user = self.create_snt_account(name="Test Account")
        self.user_write, self.anon, self.user_no_perms = self.create_base_users(
            self.account, [SNT_SETTINGS_WRITE_PERMISSION], "user write"
        )
        self.user_read = self.create_user_with_profile(
            username="user read", account=self.account, permissions=[SNT_SETTINGS_READ_PERMISSION]
        )

        self.unit_net = CostUnitType.objects.create(
            account=self.account, name="Net", value="1.8", description="One net protects 1.8 people."
        )
        self.unit_bale = CostUnitType.objects.create(account=self.account, name="Bale", value="90", invert_value=True)

        # Other account to verify tenancy isolation
        self.other_account, self.other_user = self.create_snt_account(name="Other Account")
        self.other_user = self.create_user_with_profile(
            username="other user", account=self.other_account, permissions=[SNT_SETTINGS_WRITE_PERMISSION]
        )
        self.other_unit = CostUnitType.objects.create(account=self.other_account, name="Vaccine dose", value="4")

    # List

    def test_list_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)
        names = {item["name"] for item in result}
        self.assertEqual(names, {"Net", "Bale"})

    def test_list_with_read_perm(self):
        self.client.force_authenticate(self.user_read)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)

    def test_list_returns_expected_fields(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        net = next(item for item in result if item["name"] == "Net")
        self.assertEqual(
            set(net.keys()),
            {"id", "name", "value", "invert_value", "is_proportional", "description"},
        )
        self.assertAlmostEqual(float(net["value"]), 1.8)
        self.assertFalse(net["invert_value"])
        self.assertTrue(net["is_proportional"])
        self.assertEqual(net["description"], "One net protects 1.8 people.")

    def test_list_with_no_perms(self):
        self.client.force_authenticate(self.user_no_perms)
        response = self.client.get(self.BASE_URL)
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_list_no_auth(self):
        response = self.client.get(self.BASE_URL)
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    def test_list_only_returns_own_account(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertNotIn(self.other_unit.id, {item["id"] for item in result})

    # Retrieve

    def test_retrieve_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(f"{self.BASE_URL}{self.unit_net.id}/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.unit_net.id)
        self.assertEqual(result["name"], "Net")

    def test_retrieve_other_account_not_found(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(f"{self.BASE_URL}{self.other_unit.id}/")
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)

    # Create

    def test_create_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        data = {"name": "SMC 3 cycles", "value": "3", "description": "3 per course"}
        response = self.client.post(self.BASE_URL, data=data)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        self.assertEqual(result["name"], "SMC 3 cycles")
        created = CostUnitType.objects.get(id=result["id"])
        self.assertEqual(created.account, self.account)
        self.assertAlmostEqual(float(created.value), 3)
        self.assertFalse(created.invert_value)

    def test_create_with_invert_value(self):
        self.client.force_authenticate(self.user_write)
        data = {"name": "Bale of nets", "value": "90", "invert_value": True}
        response = self.client.post(self.BASE_URL, data=data)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        self.assertAlmostEqual(float(result["value"]), 90)
        self.assertTrue(result["invert_value"])

    def test_create_without_value_allowed(self):
        self.client.force_authenticate(self.user_write)
        data = {"name": "Fixed cost"}
        response = self.client.post(self.BASE_URL, data=data)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        self.assertIsNone(result["value"])

    def test_create_non_proportional_unit(self):
        self.client.force_authenticate(self.user_write)
        data = {"name": "Flat fee", "is_proportional": False}
        response = self.client.post(self.BASE_URL, data=data)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        self.assertFalse(result["is_proportional"])
        created = CostUnitType.objects.get(id=result["id"])
        self.assertFalse(created.is_proportional)
        # Ratio is transparent to the outside: always 1 for non-proportional units.
        self.assertEqual(created.ratio, 1)

    def test_patch_is_proportional_flag(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.patch(f"{self.BASE_URL}{self.unit_net.id}/", data={"is_proportional": False})
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertFalse(result["is_proportional"])

    def test_create_duplicate_name_returns_400(self):
        self.client.force_authenticate(self.user_write)
        data = {"name": "Net", "value": "2"}
        response = self.client.post(self.BASE_URL, data=data)
        self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)

    def test_create_with_read_perm_forbidden(self):
        self.client.force_authenticate(self.user_read)
        data = {"name": "New unit"}
        response = self.client.post(self.BASE_URL, data=data)
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_create_no_auth(self):
        response = self.client.post(self.BASE_URL, data={"name": "New unit"})
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    # Update

    def test_put_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        data = {"name": "Net", "value": "2.5", "description": "Updated"}
        response = self.client.put(f"{self.BASE_URL}{self.unit_net.id}/", data=data)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertAlmostEqual(float(result["value"]), 2.5)
        self.unit_net.refresh_from_db()
        self.assertEqual(self.unit_net.description, "Updated")

    def test_patch_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.patch(f"{self.BASE_URL}{self.unit_net.id}/", data={"value": "3.3"})
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertAlmostEqual(float(result["value"]), 3.3)

    def test_patch_invert_value(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.patch(f"{self.BASE_URL}{self.unit_net.id}/", data={"invert_value": True})
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertTrue(result["invert_value"])

    def test_update_with_read_perm_forbidden(self):
        self.client.force_authenticate(self.user_read)
        response = self.client.patch(f"{self.BASE_URL}{self.unit_net.id}/", data={"value": "3.3"})
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_update_other_account_not_found(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.patch(f"{self.BASE_URL}{self.other_unit.id}/", data={"value": "9"})
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)

    # Delete

    def test_delete_unreferenced_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.delete(f"{self.BASE_URL}{self.unit_bale.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CostUnitType.objects.filter(id=self.unit_bale.id).exists())

    def test_delete_referenced_by_cost_line_returns_405(self):
        defaults = self.create_snt_default_interventions(account=self.account, created_by=self.user_write)
        InterventionCostBreakdownLine.objects.create(
            name="Cost Line",
            intervention=defaults["intervention_rts"],
            unit_cost=10,
            unit_type=self.unit_net,
            category="Procurement",
            created_by=self.user_write,
        )
        self.client.force_authenticate(self.user_write)
        response = self.client.delete(f"{self.BASE_URL}{self.unit_net.id}/")
        self.assertJSONResponse(response, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(CostUnitType.objects.filter(id=self.unit_net.id).exists())

    def test_delete_with_read_perm_forbidden(self):
        self.client.force_authenticate(self.user_read)
        response = self.client.delete(f"{self.BASE_URL}{self.unit_bale.id}/")
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_delete_other_account_not_found(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.delete(f"{self.BASE_URL}{self.other_unit.id}/")
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)
