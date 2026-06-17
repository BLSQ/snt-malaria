from rest_framework import status

from plugins.snt_malaria.models import Donor
from plugins.snt_malaria.permissions import SNT_SETTINGS_READ_PERMISSION, SNT_SETTINGS_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


class DonorAPITestCase(SNTMalariaAPITestCase):
    BASE_URL = "/api/snt_malaria/donors/"
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

        self.donor_gf = Donor.objects.create(account=self.account, name="Global Fund")
        self.donor_pmi = Donor.objects.create(account=self.account, name="PMI")

        # Other account to verify tenancy isolation
        self.other_account, _ = self.create_snt_account(name="Other Account")
        self.other_donor = Donor.objects.create(account=self.other_account, name="Other Donor")

    # List

    def test_list_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)
        names = {item["name"] for item in result}
        self.assertEqual(names, {"Global Fund", "PMI"})

    def test_list_with_read_perm(self):
        self.client.force_authenticate(self.user_read)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)

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
        self.assertNotIn(self.other_donor.id, {item["id"] for item in result})

    # Create

    def test_create_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.post(self.BASE_URL, data={"name": "World Bank"})
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        self.assertEqual(result["name"], "World Bank")
        created = Donor.objects.get(id=result["id"])
        self.assertEqual(created.account, self.account)

    def test_create_duplicate_name_returns_400(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.post(self.BASE_URL, data={"name": "Global Fund"})
        self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)

    def test_create_with_read_perm_forbidden(self):
        self.client.force_authenticate(self.user_read)
        response = self.client.post(self.BASE_URL, data={"name": "New donor"})
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_create_no_auth(self):
        response = self.client.post(self.BASE_URL, data={"name": "New donor"})
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    # Update / delete not exposed

    def test_update_not_allowed(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.patch(f"{self.BASE_URL}{self.donor_gf.id}/", data={"name": "Renamed"})
        self.assertJSONResponse(response, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete_not_allowed(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.delete(f"{self.BASE_URL}{self.donor_gf.id}/")
        self.assertJSONResponse(response, status.HTTP_405_METHOD_NOT_ALLOWED)
