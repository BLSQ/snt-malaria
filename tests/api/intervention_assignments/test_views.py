from django.contrib.gis.geos import MultiPolygon, Point, Polygon
from rest_framework import status

from iaso.models.org_unit import OrgUnit
from plugins.snt_malaria.models import BudgetAssumptions
from plugins.snt_malaria.models.intervention import Intervention, InterventionAssignment, InterventionCategory
from plugins.snt_malaria.models.scenario import Scenario
from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION, SNT_SCENARIO_FULL_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


class InterventionAssignmentsAPITests(SNTMalariaAPITestCase):
    BASE_URL = "/api/snt_malaria/intervention_assignments/"
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.source, self.version, self.project = self.create_account_datasource_version_project(
            "source", "Test Account", "project"
        )
        self.user_with_full_perm, self.anon, self.user_no_perms = self.create_base_users(
            self.account, [SNT_SCENARIO_FULL_WRITE_PERMISSION], "testuser"
        )
        self.user_with_basic_perm = self.create_user_with_profile(
            username="testuserbasic", account=self.account, permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION]
        )
        # Create a scenario
        self.scenario = self.create_snt_scenario(
            account=self.account,
            created_by=self.user_with_full_perm,
            name="Test Scenario",
        )
        self.int_category_vaccination = self.create_snt_intervention_category(
            name="Vaccination",
            account=self.account,
            created_by=self.user_with_full_perm,
        )
        self.int_category_chemoprevention = self.create_snt_intervention_category(
            name="Preventive Chemotherapy",
            account=self.account,
            created_by=self.user_with_full_perm,
        )
        self.intervention_vaccination_rts = self.create_snt_intervention(
            name="RTS,S",
            code="rts_s",
            intervention_category=self.int_category_vaccination,
            created_by=self.user_with_full_perm,
        )
        self.intervention_chemo_smc = self.create_snt_intervention(
            name="SMC",
            code="smc",
            intervention_category=self.int_category_chemoprevention,
            created_by=self.user_with_full_perm,
        )
        self.intervention_chemo_iptp = self.create_snt_intervention(
            name="IPTp",
            code="iptp",
            intervention_category=self.int_category_chemoprevention,
            created_by=self.user_with_full_perm,
        )
        self.intervention_chemo_iptp2 = self.create_snt_intervention(
            name="IPTp Variant",
            code="iptp2",
            intervention_category=self.int_category_chemoprevention,
            created_by=self.user_with_full_perm,
        )

        # Create Org Units
        self.mock_multipolygon = MultiPolygon(Polygon([[-1.3, 2.5], [-1.7, 2.8], [-1.1, 4.1], [-1.3, 2.5]]))
        self.out_district = self.create_snt_org_unit_type(name="DISTRICT")
        self.out_district.projects.set([self.project])
        self.district1 = self.create_snt_org_unit(
            org_unit_type=self.out_district,
            name="District 1",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=Point(x=4, y=50, z=100),
            geom=self.mock_multipolygon,
        )
        self.district2 = self.create_snt_org_unit(
            org_unit_type=self.out_district,
            name="District 2",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=Point(x=4, y=50, z=100),
            geom=self.mock_multipolygon,
        )
        self.assignment_rts_district_1 = self.create_snt_assignment(
            self.scenario, self.district1, self.intervention_vaccination_rts, created_by=self.user_with_full_perm
        )
        self.assignment_smc_district_1 = self.create_snt_assignment(
            self.scenario, self.district1, self.intervention_chemo_smc, created_by=self.user_with_full_perm
        )

        # Preparing other account, interventions & scenarios to test tenancy
        self.other_account, self.other_source, self.other_version, self.other_project = (
            self.create_account_datasource_version_project("other source", "other account", "other project")
        )
        self.other_admin = self.create_user_with_profile(
            username="otheradmin", account=self.other_account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )
        self.other_scenario = self.create_snt_scenario(
            account=self.other_account,
            created_by=self.other_admin,
            name="Other Scenario",
        )
        self.other_int_category = self.create_snt_intervention_category(
            name="Other Category",
            account=self.other_account,
            created_by=self.other_admin,
        )
        self.other_intervention = self.create_snt_intervention(
            name="Other Intervention",
            code="other_int",
            intervention_category=self.other_int_category,
            created_by=self.other_admin,
        )

        self.other_district_type = self.create_snt_org_unit_type(name="OTHER_DISTRICT")
        self.other_district_type.projects.set([self.other_project])
        self.other_district_1 = self.create_snt_org_unit(
            org_unit_type=self.other_district_type,
            name="Other District 1",
            version=self.other_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=Point(x=4, y=50, z=100),
            geom=self.mock_multipolygon,
        )
        self.other_district_2 = self.create_snt_org_unit(
            org_unit_type=self.other_district_type,
            name="Other District 2",
            version=self.other_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=Point(x=4, y=50, z=100),
            geom=self.mock_multipolygon,
        )
        self.other_assignment = self.create_snt_assignment(
            self.other_scenario, self.other_district_1, self.other_intervention, created_by=self.other_admin
        )

    def test_intervention_assignments_list_for_scenario(self):
        """
        This endpoint is available to all authenticated users, regardless of permissions.
        """
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{self.BASE_URL}?scenario_id={self.scenario.id}")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)
        ids = [assignment["id"] for assignment in result]
        self.assertCountEqual(ids, [self.assignment_rts_district_1.id, self.assignment_smc_district_1.id])

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.get(f"{self.BASE_URL}?scenario_id={self.scenario.id}")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)
        ids = [assignment["id"] for assignment in result]
        self.assertCountEqual(ids, [self.assignment_rts_district_1.id, self.assignment_smc_district_1.id])

        self.client.force_authenticate(user=self.user_no_perms)
        response = self.client.get(f"{self.BASE_URL}?scenario_id={self.scenario.id}")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(len(result), 2)
        ids = [assignment["id"] for assignment in result]
        self.assertCountEqual(ids, [self.assignment_rts_district_1.id, self.assignment_smc_district_1.id])

    def test_intervention_assignments_endpoint_list_unauthenticated(self):
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_intervention_assignments_retrieve(self):
        """
        This endpoint is available to all authenticated users, regardless of permissions.
        """
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{self.BASE_URL}{self.assignment_smc_district_1.id}/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.assignment_smc_district_1.id)

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.get(f"{self.BASE_URL}{self.assignment_smc_district_1.id}/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.assignment_smc_district_1.id)

        self.client.force_authenticate(user=self.user_no_perms)
        response = self.client.get(f"{self.BASE_URL}{self.assignment_smc_district_1.id}/")
        result = self.assertJSONResponse(response, status.HTTP_200_OK)
        self.assertEqual(result["id"], self.assignment_smc_district_1.id)

    def test_intervention_assignments_retrieve_unauthenticated(self):
        response = self.client.get(f"{self.BASE_URL}{self.assignment_smc_district_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_intervention_assignments_retrieve_from_other_account(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.get(f"{self.BASE_URL}{self.other_assignment.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_intervention_assignments_put_method_not_allowed(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.put(f"{self.BASE_URL}{self.assignment_smc_district_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_intervention_assignments_patch_method_not_allowed(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.patch(f"{self.BASE_URL}{self.assignment_smc_district_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_intervention_assignment_create_method_not_allowed(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.post(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_intervention_assignments_destroy_with_full_perm_own_scenario(self):
        # Create an assignment to delete
        assignment_id = self.assignment_smc_district_1.id

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{assignment_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(InterventionAssignment.objects.filter(id=assignment_id).exists())

    def test_intervention_assignments_destroy_with_full_perm_other_scenario(self):
        # Create an assignment to delete, which belongs to a scenario created by another user
        other_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Other User Scenario",
            description="Another test scenario description.",
            start_year=2025,
            end_year=2028,
        )

        assignment = InterventionAssignment.objects.create(
            scenario=self.other_scenario,
            org_unit=self.district1,
            intervention=self.intervention_vaccination_rts,
            created_by=self.user_with_basic_perm,
        )
        assignment_id = assignment.id

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{assignment_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(InterventionAssignment.objects.filter(id=assignment_id).exists())

    def test_intervention_assignments_destroy_with_basic_perm_own_scenario(self):
        # Create a scenario and assignment to delete
        scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Basic User Scenario",
            description="A test scenario for basic user.",
            start_year=2025,
            end_year=2028,
        )
        assignment = InterventionAssignment.objects.create(
            scenario=scenario,
            org_unit=self.district1,
            intervention=self.intervention_vaccination_rts,
            created_by=self.user_with_basic_perm,
        )
        assignment_id = assignment.id

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.delete(f"{self.BASE_URL}{assignment_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(InterventionAssignment.objects.filter(id=assignment_id).exists())

    def test_intervention_assignments_destroy_with_basic_perm_other_scenario(self):
        # Create an assignment to delete, which belongs to a scenario created by another user
        assignment_id = self.assignment_rts_district_1.id  # belongs to self.user_with_full_perm

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.delete(f"{self.BASE_URL}{assignment_id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(InterventionAssignment.objects.filter(id=assignment_id).exists())

    def test_intervention_assignments_destroy_no_perm(self):
        """
        Without perm, you can't delete any scenario assignments
        """
        # It will not happen, but let's create a scenario and assignment for the no perm user
        no_perm_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_no_perms,
            name="No Perm Scenario",
            description="A test scenario for no perm user.",
            start_year=2025,
            end_year=2028,
        )
        assignment = InterventionAssignment.objects.create(
            scenario=no_perm_scenario,
            org_unit=self.district1,
            intervention=self.intervention_vaccination_rts,
            created_by=self.user_no_perms,
        )
        assignment_id = assignment.id

        self.client.force_authenticate(user=self.user_no_perms)
        response = self.client.delete(f"{self.BASE_URL}{assignment_id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(InterventionAssignment.objects.filter(id=assignment_id).exists())

        # you also can't delete assignments from scenarios that belong to other users
        response = self.client.delete(f"{self.BASE_URL}{self.assignment_smc_district_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(InterventionAssignment.objects.filter(id=self.assignment_smc_district_1.id).exists())

    def test_intervention_assignments_destroy_unauthenticated(self):
        response = self.client.delete(f"{self.BASE_URL}{self.assignment_smc_district_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(InterventionAssignment.objects.filter(id=self.assignment_smc_district_1.id).exists())

    def test_intervention_assignments_destroy_on_locked_scenario(self):
        # Lock the scenario
        self.scenario.is_locked = True
        self.scenario.save()

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{self.assignment_smc_district_1.id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("The scenario is locked", response.data.get("scenario_id", ""))
        self.assertTrue(InterventionAssignment.objects.filter(id=self.assignment_smc_district_1.id).exists())

    def test_intervention_assignments_destroy_invalid_id(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}9999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_intervention_assignments_destroy_from_other_account(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{self.other_assignment.id}/")  # belongs to other account
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(InterventionAssignment.objects.filter(id=self.other_assignment.id).exists())

    def test_intervention_assignments_delete_many_with_full_perm_own_scenario(self):
        ids = InterventionAssignment.objects.filter(scenario=self.scenario, org_unit=self.district1).values_list(
            "id", flat=True
        )
        self.assertEqual(len(ids), 2)  # from setup
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}delete_many/?ids=" + ",".join(str(id) for id in ids))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        remaining_assignments = InterventionAssignment.objects.filter(scenario=self.scenario, org_unit=self.district1)
        self.assertEqual(remaining_assignments.count(), 0)

    def test_invervention_assignments_delete_many_with_full_perm_other_scenario(self):
        # Create an assignment to delete, which belongs to a scenario created by another user
        other_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Other User Scenario",
            description="Another test scenario description.",
            start_year=2025,
            end_year=2028,
        )
        assignment1 = InterventionAssignment.objects.create(
            scenario=other_scenario,
            org_unit=self.district1,
            intervention=self.intervention_vaccination_rts,
            created_by=self.user_with_basic_perm,
        )
        assignment2 = InterventionAssignment.objects.create(
            scenario=other_scenario,
            org_unit=self.district1,
            intervention=self.intervention_chemo_smc,
            created_by=self.user_with_basic_perm,
        )
        ids = [assignment1.id, assignment2.id]

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}delete_many/?ids=" + ",".join(str(id) for id in ids))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        remaining_assignments = InterventionAssignment.objects.filter(scenario=other_scenario, org_unit=self.district1)
        self.assertEqual(remaining_assignments.count(), 0)

    def test_intervention_assignments_delete_many_with_basic_perm_own_scenario(self):
        # Create a scenario and assignments to delete
        scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Basic User Scenario",
            description="A test scenario for basic user.",
            start_year=2025,
            end_year=2028,
        )
        assignment1 = InterventionAssignment.objects.create(
            scenario=scenario,
            org_unit=self.district1,
            intervention=self.intervention_vaccination_rts,
            created_by=self.user_with_basic_perm,
        )
        assignment2 = InterventionAssignment.objects.create(
            scenario=scenario,
            org_unit=self.district1,
            intervention=self.intervention_chemo_smc,
            created_by=self.user_with_basic_perm,
        )
        ids = [assignment1.id, assignment2.id]

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.delete(f"{self.BASE_URL}delete_many/?ids=" + ",".join(str(id) for id in ids))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        remaining_assignments = InterventionAssignment.objects.filter(scenario=scenario, org_unit=self.district1)
        self.assertEqual(remaining_assignments.count(), 0)

    def test_intervention_assignments_delete_many_with_basic_perm_other_scenario(self):
        ids = InterventionAssignment.objects.filter(scenario=self.scenario, org_unit=self.district1).values_list(
            "id", flat=True
        )
        count_before = len(ids)
        self.assertEqual(count_before, 2)  # from setup

        self.client.force_authenticate(user=self.user_with_basic_perm)
        response = self.client.delete(f"{self.BASE_URL}delete_many/?ids=" + ",".join(str(id) for id in ids))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        remaining_assignments = InterventionAssignment.objects.filter(scenario=self.scenario, org_unit=self.district1)
        self.assertEqual(remaining_assignments.count(), count_before)
        self.assertIn(
            "You do not have permission to delete assignments from this scenario.", response.data.get("scenario_id", "")
        )

    def test_invervention_assignments_delete_many_no_perm(self):
        ids = InterventionAssignment.objects.filter(scenario=self.scenario, org_unit=self.district1).values_list(
            "id", flat=True
        )
        count_before = len(ids)
        self.assertEqual(count_before, 2)  # from setup

        self.client.force_authenticate(user=self.user_no_perms)
        response = self.client.delete(f"{self.BASE_URL}delete_many/?ids=" + ",".join(str(id) for id in ids))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        remaining_assignments = InterventionAssignment.objects.filter(scenario=self.scenario, org_unit=self.district1)
        self.assertEqual(remaining_assignments.count(), count_before)

    def test_intervention_assignments_delete_many_unauthenticated(self):
        ids = InterventionAssignment.objects.filter(scenario=self.scenario, org_unit=self.district1).values_list(
            "id", flat=True
        )
        count_before = len(ids)
        self.assertEqual(count_before, 2)  # from setup

        response = self.client.delete(f"{self.BASE_URL}delete_many/?ids=" + ",".join(str(id) for id in ids))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        remaining_assignments = InterventionAssignment.objects.filter(scenario=self.scenario, org_unit=self.district1)
        self.assertEqual(remaining_assignments.count(), count_before)

    def test_intervention_assignments_delete_many_from_wrong_account(self):
        ids = [self.other_assignment.id, self.assignment_smc_district_1.id]  # one belongs to other account
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}delete_many/?ids=" + ",".join(str(id) for id in ids))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(InterventionAssignment.objects.filter(id=self.other_assignment.id).exists())
        self.assertTrue(
            InterventionAssignment.objects.filter(id=self.assignment_smc_district_1.id).exists()
        )  # not deleted because 404 triggered

    def test_intervention_assignments_delete_many_invalid_ids(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        invalid_ids = "9999,10000"  # Non-existent assignment IDs
        response = self.client.delete(
            f"/api/snt_malaria/intervention_assignments/delete_many/?ids={invalid_ids}",
        )
        self.assertEqual(
            response.status_code, status.HTTP_204_NO_CONTENT
        )  # No assignments deleted, but request is valid because the endpoint ignores non-existent IDs
        self.assertIn("0 intervention assignments deleted.", response.data.get("message", ""))

    def test_intervention_assignments_delete_many_no_ids(self):
        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete("/api/snt_malaria/intervention_assignments/delete_many/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_intervention_assignments_delete_many_locked_scenario(self):
        # Lock the scenario
        self.scenario.is_locked = True
        self.scenario.save()

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(
            f"/api/snt_malaria/intervention_assignments/delete_many/?ids={self.assignment_smc_district_1.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(InterventionAssignment.objects.filter(id=self.assignment_smc_district_1.id).exists())
        self.assertIn("The scenario is locked", response.data.get("scenario_id", ""))

    def test_intervention_assignments_delete_many_mixed_scenarios(self):
        # Create another assignment in a different scenario
        other_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Other User Scenario",
            description="Another test scenario description.",
            start_year=2025,
            end_year=2028,
        )
        other_assignment = InterventionAssignment.objects.create(
            scenario=other_scenario,
            org_unit=self.district1,
            intervention=self.intervention_vaccination_rts,
            created_by=self.user_with_basic_perm,
        )

        ids = [self.assignment_smc_district_1.id, other_assignment.id, self.assignment_rts_district_1.id]

        self.client.force_authenticate(user=self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}delete_many/?ids=" + ",".join(str(id) for id in ids))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertIn("3 intervention assignments deleted.", response.data.get("message", ""))

        other_scenario.refresh_from_db()
        self.scenario.refresh_from_db()
        self.assertFalse(other_scenario.intervention_assignments.exists())
        self.assertFalse(self.scenario.intervention_assignments.exists())
