from django.contrib.gis.geos import MultiPolygon, Point, Polygon
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from iaso.models import Account, OrgUnit, OrgUnitType
from iaso.models.data_source import DataSource, SourceVersion
from iaso.models.project import Project
from iaso.test import APITestCase
from plugins.snt_malaria.models import (
    Intervention,
    InterventionAssignment,
    InterventionCategory,
    Scenario,
    ScenarioRule,
    ScenarioRuleInterventionProperties,
)
from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION, SNT_SCENARIO_FULL_WRITE_PERMISSION


class ScenarioAPITestCase(APITestCase):
    BASE_URL = "/api/snt_malaria/scenarios/"

    def setUp(self):
        # Create a user and account for testing
        self.account = Account.objects.create(name="Test Account")
        self.user_with_full_perm, self.anon, self.user_no_perms = self.create_base_users(
            self.account, [SNT_SCENARIO_FULL_WRITE_PERMISSION], "testuser"
        )
        self.user_with_basic_perm = self.create_user_with_profile(
            username="testuserbasic", account=self.account, permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION]
        )
        # Create a scenario
        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_full_perm,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2026,
        )

        # Create intervention categories
        self.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=self.account,
            created_by=self.user_with_full_perm,
        )

        self.int_category_chemoprevention = InterventionCategory.objects.create(
            name="Preventive Chemotherapy",
            account=self.account,
            created_by=self.user_with_full_perm,
        )

        # Create interventions
        self.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=self.user_with_full_perm,
            intervention_category=self.int_category_vaccination,
            code="rts_s",
        )
        self.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=self.user_with_full_perm,
            intervention_category=self.int_category_chemoprevention,
            code="smc",
        )
        self.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=self.user_with_full_perm,
            intervention_category=self.int_category_chemoprevention,
            code="iptp",
        )

        # Create Org Units
        self.project = project = Project.objects.create(
            name="Project",
            app_id="APP_ID",
            account=self.account,
        )
        sw_source = DataSource.objects.create(name="data_source")
        sw_source.projects.add(project)
        self.sw_source = sw_source
        self.sw_version_1 = sw_version_1 = SourceVersion.objects.create(data_source=sw_source, number=1)
        self.account.default_version = sw_version_1
        self.account.save()
        self.out_district = OrgUnitType.objects.create(name="DISTRICT")
        self.mock_multipolygon = MultiPolygon(Polygon([[-1.3, 2.5], [-1.7, 2.8], [-1.1, 4.1], [-1.3, 2.5]]))
        self.district1 = OrgUnit.objects.create(
            org_unit_type=self.out_district,
            name="District 1",
            validation_status=OrgUnit.VALIDATION_VALID,
            version=sw_version_1,
            location=Point(x=4, y=50, z=100),
            geom=self.mock_multipolygon,
        )
        self.district2 = OrgUnit.objects.create(
            org_unit_type=self.out_district,
            name="District 2",
            validation_status=OrgUnit.VALIDATION_VALID,
            version=sw_version_1,
            location=Point(x=4, y=51, z=100),
            geom=self.mock_multipolygon,
        )
        self.district3 = OrgUnit.objects.create(
            org_unit_type=self.out_district,
            name="District 3",
            validation_status=OrgUnit.VALIDATION_VALID,
            version=sw_version_1,
            location=Point(x=4, y=52, z=100),
            geom=self.mock_multipolygon,
        )

        self.rule_1 = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria={"and": [{"==": [{"var": 2}, "F"]}]},
            created_by=self.user_with_full_perm,
            scenario=self.scenario,
            org_units_matched=[self.district1.id],
        )
        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.rule_1,
            intervention=self.intervention_chemo_iptp,
            coverage=0.8,
        )
        self.rule_2 = ScenarioRule.objects.create(
            name="Rule 2",
            priority=2,
            color="#00FF00",
            matching_criteria={"and": [{">=": [{"var": 2}, 10]}]},
            created_by=self.user_with_full_perm,
            scenario=self.scenario,
            org_units_matched=[self.district2.id],
        )
        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.rule_2,
            intervention=self.intervention_chemo_smc,
            coverage=0.9,
        )
        self.rule_3 = ScenarioRule.objects.create(
            name="Rule 3",
            priority=3,
            color="#0000FF",
            matching_criteria={"and": [{"<": [{"var": 2}, 5]}]},
            created_by=self.user_with_full_perm,
            scenario=self.scenario,
            org_units_matched=[self.district3.id],
        )
        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.rule_3,
            intervention=self.intervention_vaccination_rts,
            coverage=0.7,
        )

        # Create assignments related to the scenario
        self.assignment_1 = InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district1,
            intervention=self.intervention_chemo_iptp,
            created_by=self.user_with_full_perm,
        )
        self.assignment_2 = InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district2,
            intervention=self.intervention_chemo_smc,
            created_by=self.user_with_full_perm,
        )
        self.assignment_3 = InterventionAssignment.objects.create(
            scenario=self.scenario,
            org_unit=self.district3,
            intervention=self.intervention_vaccination_rts,
            created_by=self.user_with_full_perm,
        )

    def test_scenario_list(self):
        """
        This endpoint is available to all authenticated users, regardless of permissions.
        """
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        scenario = response.data[0]
        self.assertEqual(scenario["name"], "Test Scenario")
        self.assertEqual(scenario["description"], "A test scenario description.")
        self.assertEqual(scenario["created_by"]["id"], self.user_with_full_perm.id)

        self.client.force_authenticate(self.user_with_basic_perm)
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        scenario = response.data[0]
        self.assertEqual(scenario["id"], self.scenario.id)

        self.client.force_authenticate(self.user_no_perms)
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        scenario = response.data[0]
        self.assertEqual(scenario["id"], self.scenario.id)

    def test_scenario_list_unauthenticated(self):
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_scenario_retrieve(self):
        """
        This endpoint is available to all authenticated users, regardless of permissions.
        """
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.get(f"{self.BASE_URL}{self.scenario.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Test Scenario")
        self.assertEqual(response.data["description"], "A test scenario description.")
        self.assertEqual(response.data["created_by"]["id"], self.user_with_full_perm.id)

        self.client.force_authenticate(self.user_with_basic_perm)
        response = self.client.get(f"{self.BASE_URL}{self.scenario.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.scenario.id)
        self.assertEqual(response.data["created_by"]["id"], self.user_with_full_perm.id)

        self.client.force_authenticate(self.user_no_perms)
        response = self.client.get(f"{self.BASE_URL}{self.scenario.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.scenario.id)
        self.assertEqual(response.data["created_by"]["id"], self.user_with_full_perm.id)

    def test_scenario_retrieve_unauthenticated(self):
        response = self.client.get(f"{self.BASE_URL}{self.scenario.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_scenario_retrieve_non_existing(self):
        self.client.force_authenticate(self.user_with_full_perm)
        non_existing_scenario_id = 1234567890
        response = self.client.get(f"{self.BASE_URL}{non_existing_scenario_id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_scenario_retrieve_from_another_account(self):
        other_account = Account.objects.create(name="Other Account")
        other_user = self.create_user_with_profile(
            username="otheruser", account=other_account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )
        other_scenario = Scenario.objects.create(
            account=other_account,
            created_by=other_user,
            name="Other Account Scenario",
            description="An other account scenario description.",
            start_year=2025,
            end_year=2026,
        )
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.get(f"{self.BASE_URL}{other_scenario.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_scenario_create_full_perm(self):
        self.client.force_authenticate(self.user_with_full_perm)
        data = {"name": "New Scenario", "start_year": 2025, "end_year": 2026}
        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.count(), 2)
        new_scenario = Scenario.objects.latest("id")
        self.assertEqual(new_scenario.name, "New Scenario")
        self.assertEqual(new_scenario.account, self.account)
        self.assertEqual(new_scenario.created_by, self.user_with_full_perm)

    def test_scenario_create_basic_perm(self):
        self.client.force_authenticate(self.user_with_basic_perm)
        data = {"name": "New Scenario Basic", "start_year": 2025, "end_year": 2026}
        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.count(), 2)
        new_scenario = Scenario.objects.latest("id")
        self.assertEqual(new_scenario.name, "New Scenario Basic")
        self.assertEqual(new_scenario.account, self.account)
        self.assertEqual(new_scenario.created_by, self.user_with_basic_perm)

    def test_scenario_create_no_perms(self):
        self.client.force_authenticate(self.user_no_perms)
        data = {"name": "New Scenario No Perms", "start_year": 2025, "end_year": 2026}
        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Scenario.objects.count(), 1)  # No new scenario created

    def test_scenario_create_name_already_taken(self):
        payload = {
            "name": self.scenario.name,
            "start_year": 2025,
            "end_year": 2026,
        }
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(self.BASE_URL, payload, format="json")
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(result["name"], ["A scenario with this name already exists for your account."])
        self.assertEqual(Scenario.objects.count(), 1)

    def test_scenario_create_same_name_different_account(self):
        other_account = Account.objects.create(name="Other Account")
        other_user = self.create_user_with_profile(
            username="otheruser", account=other_account, permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION]
        )
        payload = {
            "name": self.scenario.name,  # same name as the one in setup
            "start_year": 2025,
            "end_year": 2026,
        }

        self.client.force_authenticate(user=other_user)
        response = self.client.post(self.BASE_URL, payload, format="json")
        self.assertJSONResponse(response, status.HTTP_201_CREATED)

        self.assertEqual(Scenario.objects.count(), 2)
        new_scenario = Scenario.objects.latest("id")
        self.assertEqual(new_scenario.name, "Test Scenario")
        self.assertEqual(new_scenario.account, other_account)
        self.assertEqual(new_scenario.created_by, other_user)

    def test_scenario_create_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            self.BASE_URL, {"name": "New Scenario", "start_year": 2025, "end_year": 2026}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Scenario.objects.count(), 1)

    def test_scenario_create_unauthenticated(self):
        data = {"name": "New Scenario Unauth", "start_year": 2025, "end_year": 2026}
        response = self.client.post(self.BASE_URL, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Scenario.objects.count(), 1)  # No new scenario created

    def test_update_own_scenario_full_perm(self):
        self.client.force_authenticate(self.user_with_full_perm)
        payload = {"id": self.scenario.id, "name": "Updated Scenario Name", "start_year": 2026, "end_year": 2028}
        response = self.client.put(f"{self.BASE_URL}{self.scenario.id}/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.name, "Updated Scenario Name")
        self.assertEqual(self.scenario.start_year, 2026)
        self.assertEqual(self.scenario.end_year, 2028)

    def test_update_own_scenario_basic_perm(self):
        basic_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Basic User Scenario",
            description="A basic user scenario description.",
            start_year=2025,
            end_year=2026,
        )
        self.client.force_authenticate(self.user_with_basic_perm)
        payload = {"id": self.scenario.id, "name": "Updated basic scenario", "start_year": 2026, "end_year": 2028}
        response = self.client.put(f"{self.BASE_URL}{basic_scenario.id}/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        basic_scenario.refresh_from_db()
        self.assertEqual(basic_scenario.name, "Updated basic scenario")
        self.assertEqual(basic_scenario.start_year, 2026)
        self.assertEqual(basic_scenario.end_year, 2028)

    def test_update_own_scenario_no_perms(self):
        """
        This shouldn't happen because the user without permissions can't create scenarios, but just in case.
        """
        own_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_no_perms,
            name="No Perms User Scenario",
            description="A no perms user scenario description.",
            start_year=2025,
            end_year=2026,
        )
        self.client.force_authenticate(self.user_no_perms)
        payload = {"id": own_scenario.id, "name": "Updated Scenario Name", "start_year": 2026, "end_year": 2028}
        response = self.client.put(f"{self.BASE_URL}{own_scenario.id}/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        own_scenario.refresh_from_db()
        self.assertEqual(own_scenario.name, "No Perms User Scenario")  # No changes made

    def test_update_other_scenario_full_perm(self):
        other_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Other User Scenario",
            description="An other user scenario description.",
            start_year=2025,
            end_year=2026,
        )
        self.client.force_authenticate(self.user_with_full_perm)
        payload = {"id": other_scenario.id, "name": "Updated Other Scenario", "start_year": 2026, "end_year": 2028}
        response = self.client.put(f"{self.BASE_URL}{other_scenario.id}/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        other_scenario.refresh_from_db()
        self.assertEqual(other_scenario.name, "Updated Other Scenario")
        self.assertEqual(other_scenario.start_year, 2026)
        self.assertEqual(other_scenario.end_year, 2028)

    def test_update_other_scenario_basic_perm(self):
        self.client.force_authenticate(self.user_with_basic_perm)
        payload = {"id": self.scenario.id, "name": "Updated Scenario Name", "start_year": 2026, "end_year": 2028}
        response = self.client.put(f"{self.BASE_URL}{self.scenario.id}/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.name, "Test Scenario")  # No changes made

    def test_update_other_scenario_no_perms(self):
        self.client.force_authenticate(self.user_no_perms)
        payload = {"id": self.scenario.id, "name": "Updated Scenario Name", "start_year": 2026, "end_year": 2028}
        response = self.client.put(f"{self.BASE_URL}{self.scenario.id}/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.name, "Test Scenario")  # No changes made

    def test_update_scenario_unauthenticated(self):
        payload = {"id": self.scenario.id, "name": "Updated Scenario Name", "start_year": 2026, "end_year": 2028}
        response = self.client.put(f"{self.BASE_URL}{self.scenario.id}/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.name, "Test Scenario")  # No changes made

    def test_update_scenario_from_another_account(self):
        other_account = Account.objects.create(name="Other Account")
        other_user = self.create_user_with_profile(
            username="otheruser", account=other_account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )
        other_scenario = Scenario.objects.create(
            account=other_account,
            created_by=other_user,
            name="Other Account Scenario",
            description="An other account scenario description.",
            start_year=2025,
            end_year=2026,
        )
        self.client.force_authenticate(self.user_with_full_perm)
        payload = {
            "id": other_scenario.id,
            "name": "Updated Other Account Scenario",
            "start_year": 2026,
            "end_year": 2028,
        }
        response = self.client.put(f"{self.BASE_URL}{other_scenario.id}/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        other_scenario.refresh_from_db()
        self.assertEqual(other_scenario.name, "Other Account Scenario")  # No changes made

    def test_update_scenario_non_existing(self):
        self.client.force_authenticate(self.user_with_full_perm)
        non_existing_scenario_id = 1234567890
        payload = {
            "id": non_existing_scenario_id,
            "name": "Updated Scenario Name",
            "start_year": 2026,
            "end_year": 2028,
        }
        response = self.client.put(f"{self.BASE_URL}{non_existing_scenario_id}/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_scenario_update_name_already_taken(self):
        scenario2 = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_full_perm,
            name="Test Scenario 2",
            description="A test scenario 2 description.",
            start_year=2025,
            end_year=2026,
        )
        payload = {"id": self.scenario.id, "name": scenario2.name, "start_year": 2025, "end_year": 2026}
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.put(f"{self.BASE_URL}{self.scenario.id}/", payload, format="json")
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(result["name"], ["A scenario with this name already exists for your account."])

    def test_scenario_update_start_year_greater_than_end_year(self):
        payload = {"id": self.scenario.id, "name": "Test Scenario", "start_year": 2027, "end_year": 2026}
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.put(f"{self.BASE_URL}{self.scenario.id}/", payload, format="json")
        result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(result["start_year"], ["Start year should be lower or equal end year."])

    def test_scenario_duplicate_with_full_perm(self):
        # Making sure that the right assignments are in place before duplication
        self.scenario.refresh_assignments(self.user_with_full_perm)

        payload = {
            "name": f"Copy of {self.scenario.name}",
            "description": self.scenario.description,
            "start_year": 2025,
            "end_year": 2026,
        }
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}{self.scenario.id}/duplicate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(Scenario.objects.count(), 2)
        duplicated_scenario = Scenario.objects.latest("id")
        self.assertEqual(duplicated_scenario.name, payload["name"])
        self.assertEqual(duplicated_scenario.description, payload["description"])
        self.assertEqual(duplicated_scenario.start_year, payload["start_year"])
        self.assertEqual(duplicated_scenario.end_year, payload["end_year"])

        duplicated_scenario_rules = duplicated_scenario.rules.all()
        scenario_rules = self.scenario.rules.all()
        self.assertEqual(duplicated_scenario_rules.count(), scenario_rules.count())
        for original_rule, duplicated_rule in zip(
            scenario_rules.order_by("priority"), duplicated_scenario_rules.order_by("priority")
        ):
            self.assertEqual(original_rule.name, duplicated_rule.name)
            self.assertEqual(original_rule.priority, duplicated_rule.priority)
            self.assertEqual(original_rule.color, duplicated_rule.color)
            self.assertEqual(original_rule.matching_criteria, duplicated_rule.matching_criteria)
            self.assertEqual(original_rule.org_units_matched, duplicated_rule.org_units_matched)
            self.assertEqual(original_rule.org_units_excluded, duplicated_rule.org_units_excluded)
            self.assertEqual(original_rule.org_units_included, duplicated_rule.org_units_included)
            self.assertEqual(original_rule.org_units_scope, duplicated_rule.org_units_scope)
            self.assertNotEqual(original_rule.id, duplicated_rule.id)

        # assignments are also duplicated (re generated based on the duplicated rules)
        duplicated_assignments = duplicated_scenario.intervention_assignments.all()
        initial_assignments = self.scenario.intervention_assignments.all()
        self.assertEqual(duplicated_assignments.count(), initial_assignments.count())

        # Picking a similar assignment to check if it's indeed a different object
        duplicated_assignment_district_1 = duplicated_assignments.get(org_unit=self.district1)
        initial_assignment_district_1 = initial_assignments.get(org_unit=self.district1)
        self.assertEqual(duplicated_assignment_district_1.intervention, initial_assignment_district_1.intervention)
        self.assertEqual(duplicated_assignment_district_1.org_unit, initial_assignment_district_1.org_unit)
        self.assertNotEqual(duplicated_assignment_district_1.id, initial_assignment_district_1.id)

    def test_scenario_duplicate_with_basic_perm(self):
        # Making sure that the right assignments are in place before duplication
        self.scenario.refresh_assignments(self.user_with_full_perm)

        payload = {
            "name": f"Copy of {self.scenario.name}",
            "description": self.scenario.description,
            "start_year": 2025,
            "end_year": 2026,
        }
        self.client.force_authenticate(self.user_with_basic_perm)
        response = self.client.post(f"{self.BASE_URL}{self.scenario.id}/duplicate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(Scenario.objects.count(), 2)
        duplicated_scenario = Scenario.objects.latest("id")
        self.assertEqual(duplicated_scenario.created_by, self.user_with_basic_perm)
        self.assertEqual(duplicated_scenario.account, self.account)
        self.assertEqual(duplicated_scenario.start_year, self.scenario.start_year)
        self.assertEqual(duplicated_scenario.end_year, self.scenario.end_year)
        self.assertEqual(duplicated_scenario.description, self.scenario.description)
        self.assertEqual(duplicated_scenario.name, payload["name"])

        # assignments are also duplicated (re generated based on the duplicated rules)
        duplicated_assignments = duplicated_scenario.intervention_assignments.all()
        initial_assignments = self.scenario.intervention_assignments.all()
        self.assertEqual(duplicated_assignments.count(), initial_assignments.count())

        # Picking a similar assignment to check if it's indeed a different object
        duplicated_assignment_district_1 = duplicated_assignments.get(org_unit=self.district1)
        initial_assignment_district_1 = initial_assignments.get(org_unit=self.district1)
        self.assertEqual(duplicated_assignment_district_1.intervention, initial_assignment_district_1.intervention)
        self.assertEqual(duplicated_assignment_district_1.org_unit, initial_assignment_district_1.org_unit)
        self.assertNotEqual(duplicated_assignment_district_1.id, initial_assignment_district_1.id)

        # Making sure that the base scenario didn't change
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.created_by, self.user_with_full_perm)
        self.assertNotIn("Copy of", self.scenario.name)

    def test_scenario_duplicate_no_perms(self):
        payload = {
            "name": f"Copy of {self.scenario.name}",
            "description": self.scenario.description,
            "start_year": 2025,
            "end_year": 2026,
        }
        self.client.force_authenticate(self.user_no_perms)
        response = self.client.post(f"{self.BASE_URL}{self.scenario.id}/duplicate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Scenario.objects.count(), 1)

    def test_scenario_duplicate_unauthenticated(self):
        payload = {
            "name": f"Copy of {self.scenario.name}",
            "description": self.scenario.description,
            "start_year": 2025,
            "end_year": 2026,
        }
        response = self.client.post(f"{self.BASE_URL}{self.scenario.id}/duplicate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_scenario_duplicate_from_another_account(self):
        other_account = Account.objects.create(name="Other Account")
        other_user = self.create_user_with_profile(
            username="otheruser", account=other_account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )
        other_scenario = Scenario.objects.create(
            account=other_account,
            created_by=other_user,
            name="Other Account Scenario",
            description="An other account scenario description.",
            start_year=2025,
            end_year=2026,
        )
        payload = {
            "name": f"Copy of {other_scenario.name}",
            "description": other_scenario.description,
            "start_year": 2025,
            "end_year": 2026,
        }
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}{other_scenario.id}/duplicate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Scenario.objects.count(), 2)  # one in setup & one here

    def test_scenario_duplicate_non_existing(self):
        payload = {
            "name": "Copy of Non Existing Scenario",
            "description": "Description",
            "start_year": 2025,
            "end_year": 2026,
        }
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}1234564890/duplicate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Scenario.objects.count(), 1)

    def test_scenario_duplicate_multiple_times_success(self):
        # Making sure that the right assignments are in place before duplication
        self.scenario.refresh_assignments(self.user_with_full_perm)

        # First duplication
        payload = {
            "name": f"{self.scenario.name} - copy 1",
            "description": self.scenario.description,
            "start_year": 2025,
            "end_year": 2026,
        }
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}{self.scenario.id}/duplicate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.count(), 2)
        duplicated_scenario = Scenario.objects.latest("id")

        self.assertEqual(f"{self.scenario.name} - copy 1", duplicated_scenario.name)
        # assignments are also duplicated (re generated based on the duplicated rules)
        duplicated_assignments = duplicated_scenario.intervention_assignments.all()
        initial_assignments = self.scenario.intervention_assignments.all()
        self.assertEqual(duplicated_assignments.count(), initial_assignments.count())

        # Second duplication
        payload = {
            "name": f"{self.scenario.name} - copy 2",
            "description": self.scenario.description,
            "start_year": 2025,
            "end_year": 2026,
        }
        response = self.client.post(f"{self.BASE_URL}{duplicated_scenario.id}/duplicate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.count(), 3)
        new_duplicated_scenario = Scenario.objects.latest("id")

        self.assertIn(f"{self.scenario.name} - copy 2", new_duplicated_scenario.name)
        # assignments are also duplicated (re generated based on the duplicated rules)
        new_duplicated_assignments = new_duplicated_scenario.intervention_assignments.all()
        initial_assignments = self.scenario.intervention_assignments.all()
        self.assertEqual(new_duplicated_assignments.count(), initial_assignments.count())
        self.assertEqual(new_duplicated_assignments.count(), duplicated_assignments.count())

    def test_scenario_export_to_csv(self):
        """
        This endpoint is available to all authenticated users, regardless of permissions.
        """
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.get(f"{self.BASE_URL}export_to_csv/?id={self.scenario.id}")

        csv_list = self.assertCsvFileResponse(response, return_as_lists=True)
        self.assertEqual(len(csv_list), 4)  # Headers + 3 org units
        csv_headers = csv_list[0]
        csv_district_1 = csv_list[1]
        csv_district_2 = csv_list[2]
        csv_district_3 = csv_list[3]

        self.assertSequenceEqual(
            csv_headers, ["org_unit_id", "org_unit_name", "IPTp - iptp", "RTS,S - rts_s", "SMC - smc"]
        )
        self.assertSequenceEqual(csv_district_1, [str(self.district1.id), self.district1.name, "1", "0", "0"])
        self.assertSequenceEqual(csv_district_2, [str(self.district2.id), self.district2.name, "0", "0", "1"])
        self.assertSequenceEqual(csv_district_3, [str(self.district3.id), self.district3.name, "0", "1", "0"])

        self.client.force_authenticate(self.user_with_basic_perm)
        response = self.client.get(f"{self.BASE_URL}export_to_csv/?id={self.scenario.id}")
        csv_list = self.assertCsvFileResponse(response, return_as_lists=True)
        self.assertEqual(len(csv_list), 4)  # Headers + 3 org units
        csv_headers = csv_list[0]
        csv_district_1 = csv_list[1]
        csv_district_2 = csv_list[2]
        csv_district_3 = csv_list[3]

        self.assertSequenceEqual(
            csv_headers, ["org_unit_id", "org_unit_name", "IPTp - iptp", "RTS,S - rts_s", "SMC - smc"]
        )
        self.assertSequenceEqual(csv_district_1, [str(self.district1.id), self.district1.name, "1", "0", "0"])
        self.assertSequenceEqual(csv_district_2, [str(self.district2.id), self.district2.name, "0", "0", "1"])
        self.assertSequenceEqual(csv_district_3, [str(self.district3.id), self.district3.name, "0", "1", "0"])

        self.client.force_authenticate(self.user_no_perms)
        response = self.client.get(f"{self.BASE_URL}export_to_csv/?id={self.scenario.id}")
        csv_list = self.assertCsvFileResponse(response, return_as_lists=True)
        self.assertEqual(len(csv_list), 4)  # Headers + 3 org units
        csv_headers = csv_list[0]
        csv_district_1 = csv_list[1]
        csv_district_2 = csv_list[2]
        csv_district_3 = csv_list[3]

        self.assertSequenceEqual(
            csv_headers, ["org_unit_id", "org_unit_name", "IPTp - iptp", "RTS,S - rts_s", "SMC - smc"]
        )
        self.assertSequenceEqual(csv_district_1, [str(self.district1.id), self.district1.name, "1", "0", "0"])
        self.assertSequenceEqual(csv_district_2, [str(self.district2.id), self.district2.name, "0", "0", "1"])
        self.assertSequenceEqual(csv_district_3, [str(self.district3.id), self.district3.name, "0", "1", "0"])

    def test_scenario_export_to_csv_unauthenticated(self):
        response = self.client.get(f"{self.BASE_URL}export_to_csv/?id={self.scenario.id}")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_scenario_export_to_csv_no_scenario_id_returns_template(self):
        self.client.force_authenticate(self.user_no_perms)
        response = self.client.get(f"{self.BASE_URL}export_to_csv/")

        csv_list = self.assertCsvFileResponse(response, return_as_lists=True)
        self.assertEqual(len(csv_list), 4)  # Headers + 3 org units
        csv_headers = csv_list[0]
        csv_district_1 = csv_list[1]
        csv_district_2 = csv_list[2]
        csv_district_3 = csv_list[3]

        self.assertSequenceEqual(
            csv_headers, ["org_unit_id", "org_unit_name", "IPTp - iptp", "RTS,S - rts_s", "SMC - smc"]
        )
        self.assertSequenceEqual(csv_district_1, [str(self.district1.id), self.district1.name, "0", "0", "0"])
        self.assertSequenceEqual(csv_district_2, [str(self.district2.id), self.district2.name, "0", "0", "0"])
        self.assertSequenceEqual(csv_district_3, [str(self.district3.id), self.district3.name, "0", "0", "0"])

    def test_scenario_export_to_csv_non_existing_scenario(self):
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.get(f"{self.BASE_URL}export_to_csv/?id={self.scenario.id + 1}")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_scenario_export_to_csv_no_access_to_scenario(self):
        wrong_account = Account.objects.create(name="Test Account Invalid")
        wrong_user = self.create_user_with_profile(username="testuserinvalid", account=wrong_account)

        self.client.force_authenticate(user=wrong_user)
        response = self.client.get(f"{self.BASE_URL}export_to_csv/?id={self.scenario.id}")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_scenario_import_csv_unauthenticated(self):
        response = self.client.post(f"{self.BASE_URL}import_from_csv/", {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_scenario_import_csv_missing_file(self):
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}import_from_csv/", {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)
        self.assertEqual(str(response.data["file"][0]), "No file was submitted.")

    def test_scenario_import_csv_invalid_file_type(self):
        invalid_file = SimpleUploadedFile("test.txt", b"Invalid content", content_type="text/plain")

        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}import_from_csv/", {"file": invalid_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)
        self.assertEqual(str(response.data["file"][0]), "The file must be a CSV.")

    def test_scenario_import_csv_missing_org_unit_id_column(self):
        csv_content = b"org_unit_name,IPTp - iptp,RTS,S - rts_s,SMC - smc\nDistrict 1,1,0,0\nDistrict 2,0,1,1\n"
        invalid_file = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")

        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}import_from_csv/", {"file": invalid_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)
        self.assertEqual(str(response.data["file"][0]), "The CSV must contain an 'org_unit_id' column.")

    def test_scenario_import_csv_missing_header(self):
        csv_content = (
            'org_unit_id,org_unit_name,IPTp - iptp,"RTS,S - rts_s"\n'
            f"{self.district1.id},District 1,1,0\n"
            f"{self.district2.id},District 2,0,1\n"
        )
        valid_file = SimpleUploadedFile("test.csv", csv_content.encode(), content_type="text/csv")

        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}import_from_csv/", {"file": valid_file}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)
        self.assertIn("header_errors", response.data["file"])
        self.assertIn("SMC - smc", response.data["file"]["header_errors"])

    def test_scenario_import_csv_no_assignments(self):
        csv_content = (
            'org_unit_id,org_unit_name,"IPTp - iptp","RTS,S - rts_s","SMC - smc"\n'
            f"{self.district1.id},District 1,0,0,0\n"
            f"{self.district2.id},District 2,0,0,0\n"
            f"{self.district3.id},District 3,0,0,0\n"
        )
        valid_file = SimpleUploadedFile("test.csv", csv_content.encode(), content_type="text/csv")

        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}import_from_csv/", {"file": valid_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(str(response.data[0]), "No assignments to create from the provided CSV data.")

    def test_scenario_import_csv_org_unit_not_found(self):
        unknown_org_unit_id = 9999
        csv_content = f'org_unit_id,org_unit_name,IPTp - iptp,"RTS,S - rts_s",SMC - smc\n{unknown_org_unit_id},District Unknown,1,0,0\n'
        valid_file = SimpleUploadedFile("test.csv", csv_content.encode(), content_type="text/csv")

        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}import_from_csv/", {"file": valid_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)
        self.assertIn("not_found_org_units", response.data["file"])
        self.assertIn(str(unknown_org_unit_id), response.data["file"]["not_found_org_units"])
        self.assertIn("missing_org_units_from_file", response.data["file"])
        self.assertIn(str(self.district1.id), response.data["file"]["missing_org_units_from_file"])
        self.assertIn(str(self.district2.id), response.data["file"]["missing_org_units_from_file"])

    def test_scenario_import_csv_with_full_perm(self):
        csv_content = self._generate_csv_content_for_import()
        valid_file = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")

        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}import_from_csv/", {"file": valid_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)

        new_scenario = Scenario.objects.get(id=response.data["id"])
        self._assert_valid_scenario_import(new_scenario)

    def test_scenario_import_csv_with_basic_perm(self):
        csv_content = self._generate_csv_content_for_import()
        valid_file = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")

        self.client.force_authenticate(self.user_with_basic_perm)
        response = self.client.post(f"{self.BASE_URL}import_from_csv/", {"file": valid_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)

        new_scenario = Scenario.objects.get(id=response.data["id"])
        self._assert_valid_scenario_import(new_scenario)

    def test_scenario_import_csv_no_perms(self):
        csv_content = self._generate_csv_content_for_import()
        valid_file = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")

        self.client.force_authenticate(self.user_no_perms)
        response = self.client.post(f"{self.BASE_URL}import_from_csv/", {"file": valid_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_scenario_import_csv_org_units_from_different_account(self):
        other_account, _, other_version, other_project = self.create_account_datasource_version_project(
            account_name="other_account", project_name="other_project", source_name="other_data_source"
        )
        other_org_unit_type = OrgUnitType.objects.create(name="OTHER_TYPE")
        other_org_unit_type.projects.add(other_project)
        other_org_unit = OrgUnit.objects.create(
            org_unit_type=other_org_unit_type,
            name="Other Account District",
            validation_status=OrgUnit.VALIDATION_VALID,
            version=other_version,
            location=Point(x=4, y=50, z=100),
            geom=self.mock_multipolygon,
        )

        csv_content = (
            'org_unit_id,org_unit_name,IPTp - iptp,"RTS,S - rts_s",SMC - smc\n'
            f"{other_org_unit.id},Other Account Distrinct,1,0,0\n"
            f"{self.district1.id},District 1,1,0,0\n"
            f"{self.district2.id},District 2,0,1,1\n"
        ).encode()
        valid_file = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")

        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}import_from_csv/", {"file": valid_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)
        self.assertIn("not_found_org_units", response.data["file"])
        self.assertIn(str(other_org_unit.id), response.data["file"]["not_found_org_units"])

    def test_delete_scenario_with_full_perm_own_scenario(self):
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{self.scenario.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Scenario.objects.count(), 0)

    def test_delete_scenario_with_full_perm_other_scenario(self):
        other_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,  # created by another user but same account
            name="Other User Scenario",
            description="An other user scenario description.",
            start_year=2025,
            end_year=2026,
        )
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{other_scenario.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Scenario.objects.count(), 1)  # Only the one from setup remains

    def test_delete_scenario_with_basic_perm_own_scenario(self):
        basic_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Basic User Scenario",
            description="A basic user scenario description.",
            start_year=2025,
            end_year=2026,
        )
        self.client.force_authenticate(self.user_with_basic_perm)
        response = self.client.delete(f"{self.BASE_URL}{basic_scenario.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Scenario.objects.count(), 1)  # Only the one from setup remains

    def test_delete_scenario_with_basic_perm_other_scenario(self):
        self.client.force_authenticate(self.user_with_basic_perm)
        response = self.client.delete(f"{self.BASE_URL}{self.scenario.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Scenario.objects.count(), 1)

    def test_delete_scenario_no_perms(self):
        self.client.force_authenticate(self.user_no_perms)
        response = self.client.delete(f"{self.BASE_URL}{self.scenario.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Scenario.objects.count(), 1)

    def test_delete_scenario_unauthenticated(self):
        response = self.client.delete(f"{self.BASE_URL}{self.scenario.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Scenario.objects.count(), 1)

    def test_delete_scenario_from_another_account(self):
        other_account = Account.objects.create(name="Other Account")
        other_user = self.create_user_with_profile(
            username="otheruser", account=other_account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )
        other_scenario = Scenario.objects.create(
            account=other_account,
            created_by=other_user,
            name="Other Account Scenario",
            description="An other account scenario description.",
            start_year=2025,
            end_year=2026,
        )
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.delete(f"{self.BASE_URL}{other_scenario.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Scenario.objects.count(), 2)  # both the one from setup and the other account scenario remain

    def test_reorder_rules_with_full_perm_own_scenario(self):
        """
        This test will also check the result of reordering with conflicts
        """
        new_rule = ScenarioRule.objects.create(
            scenario=self.scenario,
            priority=4,
            matching_criteria={"and": [{">=": [{"var": 2}, 40]}]},
            name="Rule 4",
            created_by=self.user_with_full_perm,
            org_units_matched=[self.district2.id],  # same as rule 2
        )
        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=new_rule,
            intervention=self.intervention_chemo_iptp,  # different intervention but same category as rule 2
            coverage=0.5,
        )
        payload = {
            "new_order": [self.rule_2.id, new_rule.id, self.rule_1.id, self.rule_3.id],
        }
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.patch(f"{self.BASE_URL}{self.scenario.id}/reorder_rules/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        for index, rule in enumerate([self.rule_2, new_rule, self.rule_1, self.rule_3], start=1):
            rule.refresh_from_db()
            self.assertEqual(rule.priority, index)
            self.assertEqual(rule.updated_by, self.user_with_full_perm)
            self.assertIsNotNone(rule.updated_at)

        # once we refresh assignments on reorder, uncomment the following lines
        # old assignments are gone
        # for assignment in [self.assignment_1, self.assignment_2, self.assignment_3]:
        #     with self.assertRaises(InterventionAssignment.DoesNotExist):
        #         InterventionAssignment.objects.get(id=assignment.id)

        # new assignments are there
        # assignments = self.scenario.intervention_assignments.order_by("id")
        # self.assertEqual(len(assignments), 3)  # new_rule & rule 2 intervention categories overlap

        # first_assignment = assignments[0]
        # self.assertEqual(first_assignment.rule, self.rule_3)
        # self.assertEqual(first_assignment.intervention, self.intervention_vaccination_rts)
        # self.assertEqual(first_assignment.org_unit, self.district3)

        # second_assignment = assignments[1]
        # self.assertEqual(second_assignment.rule, self.rule_1)
        # self.assertEqual(second_assignment.intervention, self.intervention_chemo_iptp)
        # self.assertEqual(second_assignment.org_unit, self.district1)

        # third_assignment = assignments[2]
        # self.assertEqual(third_assignment.rule, new_rule)
        # self.assertEqual(third_assignment.intervention, self.intervention_chemo_iptp)
        # self.assertEqual(third_assignment.org_unit, self.district2)

        # self.assertFalse(InterventionAssignment.objects.filter(rule=self.rule_2).exists())

    def test_reorder_rules_with_full_perm_other_scenario(self):
        other_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,  # created by another user but same account
            name="Other User Scenario",
            description="An other user scenario description.",
            start_year=2025,
            end_year=2026,
        )
        new_rule_1 = ScenarioRule.objects.create(
            scenario=other_scenario,
            priority=1,
            matching_criteria={"and": [{">=": [{"var": 2}, 10]}]},
            name="Rule 1",
            created_by=self.user_with_basic_perm,
        )
        new_rule_2 = ScenarioRule.objects.create(
            scenario=other_scenario,
            priority=2,
            matching_criteria={"and": [{">=": [{"var": 2}, 20]}]},
            name="Rule 2",
            created_by=self.user_with_basic_perm,
        )
        new_rule_3 = ScenarioRule.objects.create(
            scenario=other_scenario,
            priority=3,
            matching_criteria={"and": [{">=": [{"var": 2}, 30]}]},
            name="Rule 3",
            created_by=self.user_with_basic_perm,
        )

        self.client.force_authenticate(self.user_with_full_perm)
        payload = {
            "new_order": [new_rule_3.id, new_rule_2.id, new_rule_1.id],
        }
        response = self.client.patch(f"{self.BASE_URL}{other_scenario.id}/reorder_rules/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        for index, rule in enumerate([new_rule_3, new_rule_2, new_rule_1], start=1):
            rule.refresh_from_db()
            self.assertEqual(rule.priority, index)
            self.assertEqual(rule.updated_by, self.user_with_full_perm)
            self.assertIsNotNone(rule.updated_at)

    def test_reorder_rules_with_basic_perm_own_scenario(self):
        own_scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_basic_perm,
            name="Basic User Scenario",
            description="A basic user scenario description.",
            start_year=2025,
            end_year=2026,
        )
        new_rule_1 = ScenarioRule.objects.create(
            scenario=own_scenario,
            priority=1,
            matching_criteria={"and": [{">=": [{"var": 2}, 10]}]},
            name="Rule 1",
            created_by=self.user_with_basic_perm,
        )
        new_rule_2 = ScenarioRule.objects.create(
            scenario=own_scenario,
            priority=2,
            matching_criteria={"and": [{">=": [{"var": 2}, 20]}]},
            name="Rule 2",
            created_by=self.user_with_basic_perm,
        )
        new_rule_3 = ScenarioRule.objects.create(
            scenario=own_scenario,
            priority=3,
            matching_criteria={"and": [{">=": [{"var": 2}, 30]}]},
            name="Rule 3",
            created_by=self.user_with_basic_perm,
        )

        payload = {
            "new_order": [new_rule_3.id, new_rule_2.id, new_rule_1.id],
        }
        self.client.force_authenticate(self.user_with_basic_perm)
        response = self.client.patch(f"{self.BASE_URL}{own_scenario.id}/reorder_rules/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        for index, rule in enumerate([new_rule_3, new_rule_2, new_rule_1], start=1):
            rule.refresh_from_db()
            self.assertEqual(rule.priority, index)
            self.assertEqual(rule.updated_by, self.user_with_basic_perm)
            self.assertIsNotNone(rule.updated_at)

    def test_reorder_rules_with_basic_perm_other_scenario(self):
        payload = {
            "new_order": [self.rule_3.id, self.rule_1.id, self.rule_2.id],  # scenario does not belong to user
        }
        self.client.force_authenticate(self.user_with_basic_perm)
        response = self.client.patch(f"{self.BASE_URL}{self.scenario.id}/reorder_rules/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reorder_rules_no_perms(self):
        payload = {
            "new_order": [self.rule_3.id, self.rule_1.id, self.rule_2.id],  # scenario does not belong to user
        }
        self.client.force_authenticate(self.user_no_perms)
        response = self.client.patch(f"{self.BASE_URL}{self.scenario.id}/reorder_rules/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reorder_rules_unauthenticated(self):
        payload = {
            "new_order": [self.rule_3.id, self.rule_1.id, self.rule_2.id],
        }
        response = self.client.patch(f"{self.BASE_URL}{self.scenario.id}/reorder_rules/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reorder_rules_unknown_scenario_id(self):
        payload = {
            "new_order": [self.rule_3.id, self.rule_1.id, self.rule_2.id],
        }
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.patch(f"{self.BASE_URL}999999/reorder_rules/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reorder_rules_scenario_from_other_account(self):
        other_account = Account.objects.create(name="Other Account")
        other_user = self.create_user_with_profile(
            username="otheruser", account=other_account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )
        other_scenario = Scenario.objects.create(
            account=other_account,
            created_by=other_user,
            name="Other Account Scenario",
            description="An other account scenario description.",
            start_year=2025,
            end_year=2026,
        )
        other_rule_1 = ScenarioRule.objects.create(
            scenario=other_scenario,
            priority=1,
            matching_criteria={"and": [{">=": [{"var": 2}, 10]}]},
            name="Rule 1",
            created_by=other_user,
        )
        other_rule_2 = ScenarioRule.objects.create(
            scenario=other_scenario,
            priority=2,
            matching_criteria={"and": [{">=": [{"var": 2}, 20]}]},
            name="Rule 2",
            created_by=other_user,
        )

        payload = {
            "new_order": [other_rule_2.id, other_rule_1.id],
        }
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.patch(f"{self.BASE_URL}{other_scenario.id}/reorder_rules/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def _generate_csv_content_for_import(self) -> bytes:
        csv_content = (
            'org_unit_id,org_unit_name,IPTp - iptp,"RTS,S - rts_s",SMC - smc\n'
            f"{self.district1.id},District 1,1,0,0\n"
            f"{self.district2.id},District 2,0,0,1\n"
            f"{self.district3.id},District 3,0,1,0\n"
        ).encode()
        return csv_content

    def _assert_valid_scenario_import(self, scenario: Scenario):
        # Verify that the scenario and assignments were created
        self.assertEqual(scenario.intervention_assignments.count(), 3)

        assignments_district_1 = InterventionAssignment.objects.filter(scenario=scenario, org_unit=self.district1)
        assignments_district_2 = InterventionAssignment.objects.filter(scenario=scenario, org_unit=self.district2)
        assignments_district_3 = InterventionAssignment.objects.filter(scenario=scenario, org_unit=self.district3)

        self.assertEqual(assignments_district_1.count(), 1)
        self.assertEqual(assignments_district_1.first().intervention, self.intervention_chemo_iptp)
        self.assertEqual(assignments_district_2.count(), 1)
        self.assertEqual(assignments_district_2.first().intervention, self.intervention_chemo_smc)
        self.assertEqual(assignments_district_3.count(), 1)
        self.assertEqual(assignments_district_3.first().intervention, self.intervention_vaccination_rts)
