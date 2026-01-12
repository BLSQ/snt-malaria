from iaso.models.base import Account
from iaso.models.org_unit import OrgUnit, OrgUnitType
from iaso.test import APITestCase
from plugins.snt_malaria.models.intervention import Intervention, InterventionAssignment, InterventionCategory
from plugins.snt_malaria.models.scenario import Scenario


class InterventionAssignmentsAPITests(APITestCase):
    def setUp(cls):
        cls.account = Account.objects.create(name="Test Account 2")
        cls.user = cls.create_user_with_profile(username="testuserinterventionassignments", account=cls.account)
        # Create a scenario
        cls.scenario = Scenario.objects.create(
            account=cls.account,
            created_by=cls.user,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2028,
        )
        cls.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=cls.account,
            created_by=cls.user,
        )
        cls.int_category_chemoprevention = InterventionCategory.objects.create(
            name="Preventive Chemotherapy",
            account=cls.account,
            created_by=cls.user,
        )
        cls.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=cls.user,
            intervention_category=cls.int_category_vaccination,
            code="rts_s",
        )
        cls.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
            code="smc",
        )
        cls.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
            code="iptp",
        )

        # Create Org Units
        cls.out_district = OrgUnitType.objects.create(name="DISTRICT")
        cls.district1 = OrgUnit.objects.create(org_unit_type=cls.out_district, name="District 1")
        cls.district2 = OrgUnit.objects.create(org_unit_type=cls.out_district, name="District 2")

    def test_intervention_assignments_endpoint_authenticated(self):
        self.client.force_authenticate(user=self.user)

        assignments = [
            InterventionAssignment(
                scenario=self.scenario,
                org_unit=self.district1,
                intervention=self.intervention_vaccination_rts,
                created_by=self.user,
            ),
            InterventionAssignment(
                scenario=self.scenario,
                org_unit=self.district1,
                intervention=self.intervention_chemo_smc,
                created_by=self.user,
            ),
        ]
        InterventionAssignment.objects.bulk_create(assignments)

        response = self.client.get("/api/snt_malaria/intervention_assignments/?scenario_id=" + str(self.scenario.id))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_intervention_assignments_endpoint_unauthenticated(self):
        response = self.client.get("/api/snt_malaria/intervention_assignments/")
        self.assertEqual(response.status_code, 401)

    def test_intervention_assignments_endpoint_method_not_allowed(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.put("/api/snt_malaria/intervention_assignments/")
        self.assertEqual(response.status_code, 405)

    def test_intervention_assignments_invalid_scenario(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "scenario_id": 9999,  # Non-existent scenario
            "orgunit_interventions": [
                {
                    "org_unit": self.district1.id,
                    "interventions": [self.intervention_vaccination_rts.id],
                }
            ],
        }
        response = self.client.post("/api/snt_malaria/intervention_assignments/", data=payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_intervention_assignments_create_many(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "scenario_id": self.scenario.id,
            "orgunit_interventions": {
                self.district1.id: [self.intervention_vaccination_rts.id, self.intervention_chemo_smc.id],
                self.district2.id: [self.intervention_chemo_smc.id, self.intervention_chemo_iptp.id],
            },
        }
        response = self.client.post("/api/snt_malaria/intervention_assignments/", data=payload, format="json")
        self.assertEqual(response.status_code, 201)
        assignments = InterventionAssignment.objects.filter(scenario=self.scenario)
        self.assertEqual(assignments.count(), 4)
        assignments_district1 = assignments.filter(org_unit=self.district1)
        self.assertEqual(assignments_district1.count(), 2)
        assigned_interventions_district1 = set(assignments_district1.values_list("intervention_id", flat=True))
        self.assertSetEqual(
            assigned_interventions_district1,
            {self.intervention_vaccination_rts.id, self.intervention_chemo_smc.id},
        )
        assignments_district2 = assignments.filter(org_unit=self.district2)
        self.assertEqual(assignments_district2.count(), 2)
        assigned_interventions_district2 = set(assignments_district2.values_list("intervention_id", flat=True))
        self.assertSetEqual(
            assigned_interventions_district2,
            {self.intervention_chemo_smc.id, self.intervention_chemo_iptp.id},
        )

    def test_intervention_assignments_create_with_invalid_org_unit(self):
        self.client.force_authenticate(user=self.user)
        invalid_org_unit_id = 9999  # Non-existent org unit
        payload = {
            "scenario_id": self.scenario.id,
            "orgunit_interventions": {
                invalid_org_unit_id: [self.intervention_vaccination_rts.id],
            },
        }
        response = self.client.post("/api/snt_malaria/intervention_assignments/", data=payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_intervention_assignments_create_with_invalid_intervention(self):
        self.client.force_authenticate(user=self.user)
        invalid_intervention_id = 9999  # Non-existent intervention
        payload = {
            "scenario_id": self.scenario.id,
            "orgunit_interventions": {
                self.district1.id: [invalid_intervention_id],
            },
        }
        response = self.client.post("/api/snt_malaria/intervention_assignments/", data=payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_intervention_assignments_create_on_locked_scenario(self):
        self.client.force_authenticate(user=self.user)
        # Lock the scenario
        self.scenario.is_locked = True
        self.scenario.save()

        payload = {
            "scenario_id": self.scenario.id,
            "orgunit_interventions": {
                self.district1.id: [self.intervention_vaccination_rts.id],
            },
        }
        response = self.client.post("/api/snt_malaria/intervention_assignments/", data=payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("The scenario is locked", response.data.get("scenario_id", [""])[0])

    def test_intervention_assignments_destroy(self):
        self.client.force_authenticate(user=self.user)
        # Create an assignment to delete
        assignment = InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention_vaccination_rts,
            created_by=self.user,
        )
        url = f"/api/snt_malaria/intervention_assignments/{assignment.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(InterventionAssignment.objects.filter(id=assignment.id).exists())

    def test_intervention_assignments_destroy_on_locked_scenario(self):
        self.client.force_authenticate(user=self.user)
        # Create an assignment to delete
        assignment = InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention_vaccination_rts,
            created_by=self.user,
        )
        # Lock the scenario
        self.scenario.is_locked = True
        self.scenario.save()

        url = f"/api/snt_malaria/intervention_assignments/{assignment.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 400)
        self.assertIn("The scenario is locked", response.data.get("scenario_id", ""))
        self.assertTrue(InterventionAssignment.objects.filter(id=assignment.id).exists())

    def test_intervention_assignments_destroy_unauthenticated(self):
        # Create an assignment to delete
        assignment = InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention_vaccination_rts,
            created_by=self.user,
        )
        url = f"/api/snt_malaria/intervention_assignments/{assignment.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 401)
        self.assertTrue(InterventionAssignment.objects.filter(id=assignment.id).exists())

    def test_intervention_assignments_destroy_invalid_id(self):
        self.client.force_authenticate(user=self.user)
        invalid_assignment_id = 9999  # Non-existent assignment
        url = f"/api/snt_malaria/intervention_assignments/{invalid_assignment_id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 404)

    def test_intervention_assignments_delete_many(self):
        self.client.force_authenticate(user=self.user)
        # Create multiple assignments
        assignments = [
            InterventionAssignment(
                scenario=self.scenario,
                org_unit=self.district1,
                intervention=self.intervention_vaccination_rts,
                created_by=self.user,
            ),
            InterventionAssignment(
                scenario=self.scenario,
                org_unit=self.district1,
                intervention=self.intervention_chemo_smc,
                created_by=self.user,
            ),
        ]
        InterventionAssignment.objects.bulk_create(assignments)

        # Remove all assignments for district1 by sending an empty list of interventions
        response = self.client.delete(
            "/api/snt_malaria/intervention_assignments/delete_many/?ids=" + ",".join(str(a.id) for a in assignments),
        )
        self.assertEqual(response.status_code, 204)
        remaining_assignments = InterventionAssignment.objects.filter(scenario=self.scenario, org_unit=self.district1)
        self.assertEqual(remaining_assignments.count(), 0)

    def test_intervention_assignments_delete_many_unauthenticated(self):
        # Create multiple assignments
        assignments = [
            InterventionAssignment(
                scenario=self.scenario,
                org_unit=self.district1,
                intervention=self.intervention_vaccination_rts,
                created_by=self.user,
            ),
            InterventionAssignment(
                scenario=self.scenario,
                org_unit=self.district1,
                intervention=self.intervention_chemo_smc,
                created_by=self.user,
            ),
        ]
        InterventionAssignment.objects.bulk_create(assignments)

        # Attempt to delete without authentication
        response = self.client.delete(
            "/api/snt_malaria/intervention_assignments/delete_many/?ids=" + ",".join(str(a.id) for a in assignments),
        )
        self.assertEqual(response.status_code, 401)
        remaining_assignments = InterventionAssignment.objects.filter(scenario=self.scenario, org_unit=self.district1)
        self.assertEqual(remaining_assignments.count(), 2)

    def test_intervention_assignments_delete_many_invalid_ids(self):
        self.client.force_authenticate(user=self.user)
        invalid_ids = "9999,10000"  # Non-existent assignment IDs
        response = self.client.delete(
            f"/api/snt_malaria/intervention_assignments/delete_many/?ids={invalid_ids}",
        )
        self.assertEqual(response.status_code, 204)  # No assignments deleted, but request is valid

    def test_intervention_assignments_delete_many_no_ids(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete("/api/snt_malaria/intervention_assignments/delete_many/")
        self.assertEqual(response.status_code, 400)

    def test_intervention_assignments_delete_many_locked_scenario(self):
        self.client.force_authenticate(user=self.user)
        # Create an assignment to delete
        assignment = InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention_vaccination_rts,
            created_by=self.user,
        )
        # Lock the scenario
        self.scenario.is_locked = True
        self.scenario.save()

        response = self.client.delete(f"/api/snt_malaria/intervention_assignments/delete_many/?ids={assignment.id}")
        self.assertEqual(response.status_code, 400)
        self.assertTrue(InterventionAssignment.objects.filter(id=assignment.id).exists())
        self.assertIn("The scenario is locked", response.data.get("scenario_id", ""))
