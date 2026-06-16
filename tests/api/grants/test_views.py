from decimal import Decimal

from rest_framework import status

from plugins.snt_malaria.models import Donor, Grant
from plugins.snt_malaria.permissions import SNT_SETTINGS_READ_PERMISSION, SNT_SETTINGS_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


class GrantAPITestCase(SNTMalariaAPITestCase):
    BASE_URL = "/api/snt_malaria/grants/"
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

        self.grant_nfm = Grant.objects.create(
            account=self.account,
            donor=self.donor_gf,
            name="NFM4",
            short_name="NFM4",
            description="Global Fund grant cycle",
            amount=Decimal("1000000.00"),
        )
        self.grant_pmi = Grant.objects.create(account=self.account, donor=self.donor_pmi, name="PMI 2026")

        # Other account to verify tenancy isolation
        self.other_account, _ = self.create_snt_account(name="Other Account")
        self.other_user = self.create_user_with_profile(
            username="other user", account=self.other_account, permissions=[SNT_SETTINGS_WRITE_PERMISSION]
        )
        self.other_donor = Donor.objects.create(account=self.other_account, name="Other Donor")
        self.other_grant = Grant.objects.create(account=self.other_account, donor=self.other_donor, name="Other Grant")

    # List

    def test_list_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)
        names = {item["name"] for item in result}
        self.assertEqual(names, {"NFM4", "PMI 2026"})

    def test_list_with_read_perm(self):
        self.client.force_authenticate(self.user_read)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)

    def test_list_returns_expected_fields(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(self.BASE_URL)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        nfm = next(item for item in result if item["name"] == "NFM4")
        self.assertEqual(set(nfm.keys()), {"id", "name", "short_name", "description", "amount", "donor", "donor_name"})
        self.assertEqual(nfm["short_name"], "NFM4")
        self.assertEqual(nfm["description"], "Global Fund grant cycle")
        self.assertEqual(nfm["amount"], "1000000.00")
        self.assertEqual(nfm["donor"], self.donor_gf.id)
        self.assertEqual(nfm["donor_name"], "Global Fund")

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
        self.assertNotIn(self.other_grant.id, {item["id"] for item in result})

    # Retrieve

    def test_retrieve_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(f"{self.BASE_URL}{self.grant_nfm.id}/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.grant_nfm.id)
        self.assertEqual(result["name"], "NFM4")

    def test_retrieve_other_account_not_found(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.get(f"{self.BASE_URL}{self.other_grant.id}/")
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)

    # Create

    def test_create_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        data = {
            "name": "NFM5",
            "short_name": "NFM5",
            "description": "Next cycle",
            "amount": "2000000.00",
            "donor": self.donor_gf.id,
        }
        response = self.client.post(self.BASE_URL, data=data)
        result = self.assertJSONResponse(response, status.HTTP_201_CREATED)
        self.assertEqual(result["name"], "NFM5")
        created = Grant.objects.get(id=result["id"])
        self.assertEqual(created.account, self.account)
        self.assertEqual(created.donor, self.donor_gf)
        self.assertEqual(created.amount, Decimal("2000000.00"))

    def test_create_requires_donor(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.post(self.BASE_URL, data={"name": "No donor grant"})
        self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)

    def test_create_with_other_account_donor_returns_400(self):
        self.client.force_authenticate(self.user_write)
        data = {"name": "Sneaky grant", "donor": self.other_donor.id}
        response = self.client.post(self.BASE_URL, data=data)
        self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)

    def test_create_duplicate_name_returns_400(self):
        self.client.force_authenticate(self.user_write)
        data = {"name": "NFM4", "donor": self.donor_gf.id}
        response = self.client.post(self.BASE_URL, data=data)
        self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)

    def test_create_with_read_perm_forbidden(self):
        self.client.force_authenticate(self.user_read)
        data = {"name": "New grant", "donor": self.donor_gf.id}
        response = self.client.post(self.BASE_URL, data=data)
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_create_no_auth(self):
        response = self.client.post(self.BASE_URL, data={"name": "New grant", "donor": self.donor_gf.id})
        self.assertJSONResponse(response, status.HTTP_401_UNAUTHORIZED)

    # Update

    def test_put_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        data = {
            "name": "NFM4 updated",
            "short_name": "NFM4u",
            "description": "Updated",
            "amount": "3000000.00",
            "donor": self.donor_pmi.id,
        }
        response = self.client.put(f"{self.BASE_URL}{self.grant_nfm.id}/", data=data)
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["name"], "NFM4 updated")
        self.grant_nfm.refresh_from_db()
        self.assertEqual(self.grant_nfm.donor, self.donor_pmi)
        self.assertEqual(self.grant_nfm.description, "Updated")

    def test_patch_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.patch(f"{self.BASE_URL}{self.grant_nfm.id}/", data={"amount": "1500000.00"})
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["amount"], "1500000.00")

    def test_patch_with_other_account_donor_returns_400(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.patch(f"{self.BASE_URL}{self.grant_nfm.id}/", data={"donor": self.other_donor.id})
        self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)

    def test_update_with_read_perm_forbidden(self):
        self.client.force_authenticate(self.user_read)
        response = self.client.patch(f"{self.BASE_URL}{self.grant_nfm.id}/", data={"name": "Nope"})
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_update_other_account_not_found(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.patch(f"{self.BASE_URL}{self.other_grant.id}/", data={"name": "Nope"})
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)

    # Delete

    def test_delete_unreferenced_with_write_perm(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.delete(f"{self.BASE_URL}{self.grant_pmi.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Grant.objects.filter(id=self.grant_pmi.id).exists())

    def test_delete_referenced_by_intervention_unassigns_grant(self):
        defaults = self.create_snt_default_interventions(account=self.account, created_by=self.user_write)
        intervention = defaults["intervention_rts"]
        intervention.grant = self.grant_nfm
        intervention.save()

        self.client.force_authenticate(self.user_write)
        response = self.client.delete(f"{self.BASE_URL}{self.grant_nfm.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Grant.objects.filter(id=self.grant_nfm.id).exists())
        intervention.refresh_from_db()
        self.assertIsNone(intervention.grant)

    def test_delete_referenced_by_assignment_unassigns_grant(self):
        defaults = self.create_snt_default_interventions(account=self.account, created_by=self.user_write)
        scenario = self.create_snt_scenario(account=self.account, created_by=self.user_write, name="Scenario")
        org_unit = self.create_snt_org_unit(name="District")
        assignment = self.create_snt_assignment(
            scenario=scenario,
            org_unit=org_unit,
            intervention=defaults["intervention_rts"],
            created_by=self.user_write,
        )
        assignment.grant = self.grant_nfm
        assignment.save()

        self.client.force_authenticate(self.user_write)
        response = self.client.delete(f"{self.BASE_URL}{self.grant_nfm.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Grant.objects.filter(id=self.grant_nfm.id).exists())
        assignment.refresh_from_db()
        self.assertIsNone(assignment.grant)

    def test_delete_with_read_perm_forbidden(self):
        self.client.force_authenticate(self.user_read)
        response = self.client.delete(f"{self.BASE_URL}{self.grant_pmi.id}/")
        self.assertJSONResponse(response, status.HTTP_403_FORBIDDEN)

    def test_delete_other_account_not_found(self):
        self.client.force_authenticate(self.user_write)
        response = self.client.delete(f"{self.BASE_URL}{self.other_grant.id}/")
        self.assertJSONResponse(response, status.HTTP_404_NOT_FOUND)
