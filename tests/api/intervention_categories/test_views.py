from rest_framework import status

from iaso.test import APITestCase
from plugins.snt_malaria.models import InterventionCategory
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION


class InterventionCategoryAPITestCase(APITestCase):
    BASE_URL = "/api/snt_malaria/intervention_categories/"

    def setUp(self):
        self.account, _, _, _ = self.create_account_datasource_version_project(
            account_name="account", project_name="project", source_name="source"
        )
        self.user_with_perms, self.anon, self.user_no_perms = self.create_base_users(
            self.account, [SNT_SCENARIO_FULL_WRITE_PERMISSION], "user"
        )

        self.intervention_category_1 = InterventionCategory.objects.create(
            account=self.account,
            created_by=self.user_with_perms,
            name="Intervention Category 1",
            short_name="IC1",
            description="Description for Intervention Category 1",
        )
        self.intervention_category_2 = InterventionCategory.objects.create(
            account=self.account,
            created_by=self.user_with_perms,
            name="Intervention Category 2",
            short_name="IC2",
            description="Description for Intervention Category 2",
        )
        self.intervention_category_3 = InterventionCategory.objects.create(
            account=self.account,
            created_by=self.user_no_perms,
            name="Intervention Category 3",
            short_name="IC3",
            description="Description for Intervention Category 3",
        )

        # To check if tenancy is respected
        self.account_2, _, _, _ = self.create_account_datasource_version_project(
            account_name="account2", project_name="project2", source_name="source2"
        )
        self.user_with_perms2, _, _ = self.create_base_users(
            self.account_2, [SNT_SCENARIO_FULL_WRITE_PERMISSION], "user2"
        )
        self.intervention_category_other_account = InterventionCategory.objects.create(
            account=self.account_2,
            created_by=self.user_with_perms2,
            name="Intervention Category Other Account",
            short_name="ICOA",
            description="Description for Intervention Category Other Account",
        )

    def test_list_intervention_categories(self):
        self.client.force_authenticate(user=self.user_with_perms)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 3)  # Should only return categories for self.account
        self.assertEqual(result[0]["id"], self.intervention_category_1.id)
        self.assertEqual(result[1]["id"], self.intervention_category_2.id)
        self.assertEqual(result[2]["id"], self.intervention_category_3.id)

    def test_list_intervention_categories_no_auth(self):
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
