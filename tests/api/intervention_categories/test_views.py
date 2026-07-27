from rest_framework import status

from plugins.snt_malaria.models import InterventionCategory
from plugins.snt_malaria.permissions import SNT_SETTINGS_READ_PERMISSION, SNT_SETTINGS_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


class InterventionCategoryAPITestCase(SNTMalariaAPITestCase):
    BASE_URL = "/api/snt_malaria/intervention_categories/"
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

        self.category_1 = self.create_snt_intervention_category(
            account=self.account,
            created_by=self.user_write,
            name="Intervention Category 1",
            short_name="IC1",
            description="Description for Intervention Category 1",
        )
        self.category_2 = self.create_snt_intervention_category(
            account=self.account,
            created_by=self.user_write,
            name="Intervention Category 2",
            short_name="IC2",
            description="Description for Intervention Category 2",
        )

        # Other account to verify tenancy isolation
        self.other_account, self.other_user = self.create_snt_account(name="Other Account")
        self.other_user = self.create_user_with_profile(
            username="other user", account=self.other_account, permissions=[SNT_SETTINGS_WRITE_PERMISSION]
        )
        self.other_category = self.create_snt_intervention_category(
            account=self.other_account,
            created_by=self.other_user,
            name="Intervention Category Other Account",
        )

    # List

    def test_list_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)
        names = {item["name"] for item in result}
        self.assertEqual(names, {"Intervention Category 1", "Intervention Category 2"})

    def test_list_with_read_perm(self):
        self.client.force_authenticate(self.user_read)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)

    def test_list_returns_expected_fields(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        category = next(item for item in result if item["name"] == "Intervention Category 1")
        self.assertEqual(
            set(category.keys()),
            {
                "id",
                "account",
                "name",
                "short_name",
                "description",
                "interventions",
                "created_by",
                "created_at",
                "updated_at",
            },
        )
        self.assertEqual(category["short_name"], "IC1")
        self.assertEqual(category["description"], "Description for Intervention Category 1")

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
        self.assertNotIn(self.other_category.id, {item["id"] for item in result})

    # Retrieve

    def test_retrieve_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(f"{self.BASE_URL}{self.category_1.id}/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.category_1.id)
        self.assertEqual(result["name"], "Intervention Category 1")

    def test_retrieve_other_account_not_found(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(f"{self.BASE_URL}{self.other_category.id}/")
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)

    # Create

    def test_create_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        data = {"name": "New Category", "short_name": "NC", "description": "A new category"}
        response = self.client.post(self.BASE_URL, data=data)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        self.assertEqual(result["name"], "New Category")
        created = InterventionCategory.objects.get(id=result["id"])
        self.assertEqual(created.account, self.account)
        self.assertEqual(created.created_by, self.user_write)
        self.assertEqual(created.short_name, "NC")
        self.assertEqual(created.description, "A new category")

    def test_create_duplicate_name_returns_400(self):
        self.client.force_authenticate(self.user_write)
        data = {"name": "Intervention Category 1"}
        response = self.client.post(self.BASE_URL, data=data)
        self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)

    def test_create_with_read_perm_forbidden(self):
        self.client.force_authenticate(self.user_read)
        data = {"name": "New Category"}
        response = self.client.post(self.BASE_URL, data=data)
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_create_no_auth(self):
        response = self.client.post(self.BASE_URL, data={"name": "New Category"})
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    # Update

    def test_put_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        data = {"name": "Intervention Category 1", "short_name": "IC1", "description": "Updated"}
        response = self.client.put(f"{self.BASE_URL}{self.category_1.id}/", data=data)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["description"], "Updated")
        self.category_1.refresh_from_db()
        self.assertEqual(self.category_1.description, "Updated")

    def test_patch_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.patch(f"{self.BASE_URL}{self.category_1.id}/", data={"name": "Renamed Category"})
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["name"], "Renamed Category")

    def test_update_with_read_perm_forbidden(self):
        self.client.force_authenticate(self.user_read)
        response = self.client.patch(f"{self.BASE_URL}{self.category_1.id}/", data={"name": "Renamed Category"})
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_update_other_account_not_found(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.patch(f"{self.BASE_URL}{self.other_category.id}/", data={"name": "Renamed"})
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)

    # Delete

    def test_delete_unreferenced_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.delete(f"{self.BASE_URL}{self.category_2.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(InterventionCategory.objects.filter(id=self.category_2.id).exists())

    def test_delete_referenced_by_intervention_returns_405(self):
        self.create_snt_intervention(
            intervention_category=self.category_1,
            created_by=self.user_write,
            name="Intervention using category 1",
        )
        self.client.force_authenticate(self.user_write)
        response = self.client.delete(f"{self.BASE_URL}{self.category_1.id}/")
        self.assertJSONResponse(response, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(InterventionCategory.objects.filter(id=self.category_1.id).exists())

    def test_delete_with_read_perm_forbidden(self):
        self.client.force_authenticate(self.user_read)
        response = self.client.delete(f"{self.BASE_URL}{self.category_2.id}/")
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_delete_other_account_not_found(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.delete(f"{self.BASE_URL}{self.other_category.id}/")
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)
