from django.contrib.gis.geos import MultiPolygon, Point, Polygon
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from iaso.models import Account, OrgUnit, OrgUnitType
from iaso.models.data_source import DataSource, SourceVersion
from iaso.models.project import Project
from iaso.test import APITestCase
from plugins.snt_malaria.models import Intervention, InterventionAssignment, InterventionCategory, Scenario
from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION, SNT_SCENARIO_FULL_WRITE_PERMISSION


class ScenarioAPITestCase(APITestCase):
    BASE_URL = "/api/snt_malaria/scenarios/"

    def setUp(cls):
        # Create a user and account for testing
        cls.account = Account.objects.create(name="Test Account")
        cls.user_with_full_perm, cls.anon, cls.user_no_perms = cls.create_base_users(
            cls.account, [SNT_SCENARIO_FULL_WRITE_PERMISSION], "testuser"
        )
        cls.user_with_basic_perm = cls.create_user_with_profile(
            username="testuserbasic", account=cls.account, permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION]
        )
        # Create a scenario
        cls.scenario = Scenario.objects.create(
            account=cls.account,
            created_by=cls.user_with_full_perm,
            name="Test Scenario",
            description="A test scenario description.",
            start_year=2025,
            end_year=2026,
        )

        # Create intervention categories
        cls.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=cls.account,
            created_by=cls.user_with_full_perm,
        )

        cls.int_category_chemoprevention = InterventionCategory.objects.create(
            name="Preventive Chemotherapy",
            account=cls.account,
            created_by=cls.user_with_full_perm,
        )

        # Create interventions
        cls.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=cls.user_with_full_perm,
            intervention_category=cls.int_category_vaccination,
            code="rts_s",
        )
        cls.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=cls.user_with_full_perm,
            intervention_category=cls.int_category_chemoprevention,
            code="smc",
        )
        cls.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=cls.user_with_full_perm,
            intervention_category=cls.int_category_chemoprevention,
            code="iptp",
        )

        # Create Org Units
        cls.project = project = Project.objects.create(
            name="Project",
            app_id="APP_ID",
            account=cls.account,
        )
        sw_source = DataSource.objects.create(name="data_source")
        sw_source.projects.add(project)
        cls.sw_source = sw_source
        cls.sw_version_1 = sw_version_1 = SourceVersion.objects.create(data_source=sw_source, number=1)
        cls.account.default_version = sw_version_1
        cls.account.save()
        cls.out_district = OrgUnitType.objects.create(name="DISTRICT")
        cls.mock_multipolygon = MultiPolygon(Polygon([[-1.3, 2.5], [-1.7, 2.8], [-1.1, 4.1], [-1.3, 2.5]]))
        cls.district1 = OrgUnit.objects.create(
            org_unit_type=cls.out_district,
            name="District 1",
            validation_status=OrgUnit.VALIDATION_VALID,
            version=sw_version_1,
            location=Point(x=4, y=50, z=100),
            geom=cls.mock_multipolygon,
        )
        cls.district2 = OrgUnit.objects.create(
            org_unit_type=cls.out_district,
            name="District 2",
            validation_status=OrgUnit.VALIDATION_VALID,
            version=sw_version_1,
            location=Point(x=4, y=50, z=100),
            geom=cls.mock_multipolygon,
        )

        # Create assignments related to the scenario
        cls.assignment = InterventionAssignment.objects.create(
            scenario=cls.scenario,
            org_unit=cls.district1,
            intervention=cls.intervention_chemo_iptp,
            created_by=cls.user_with_full_perm,
        )
        cls.assignment = InterventionAssignment.objects.create(
            scenario=cls.scenario,
            org_unit=cls.district2,
            intervention=cls.intervention_chemo_smc,
            created_by=cls.user_with_full_perm,
        )
        cls.assignment = InterventionAssignment.objects.create(
            scenario=cls.scenario,
            org_unit=cls.district2,
            intervention=cls.intervention_vaccination_rts,
            created_by=cls.user_with_full_perm,
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
        response = self.client.post(self.BASE_URL, {"name": "Test Scenario", "start_year": 2025, "end_year": 2026}, format="json")
        jsonResponse = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(jsonResponse["name"], ["A scenario with this name already exists for your account."])
        self.assertEqual(Scenario.objects.count(), 1)

    def test_scenario_create_same_name_different_account(self):
        other_account = Account.objects.create(name="Other Account")
        other_user = self.create_user_with_profile(username="otheruser", account=other_account)
        self.client.force_authenticate(user=other_user)

        response = self.client.post(self.BASE_URL, {"name": "Test Scenario", "start_year": 2025, "end_year": 2026}, format="json")
        self.assertJSONResponse(response, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.count(), 2)
        new_scenario = Scenario.objects.latest("id")
        self.assertEqual(new_scenario.name, "Test Scenario")
        self.assertEqual(new_scenario.account, other_account)
        self.assertEqual(new_scenario.created_by, other_user)

    def test_scenario_create_empty_name(self):
        response = self.client.post(self.BASE_URL, {"name": "", "start_year": 2025, "end_year": 2026}, format="json")
        jsonResponse = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(jsonResponse["name"], ["This field may not be blank."])
        self.assertEqual(Scenario.objects.count(), 1)

    def test_scenario_create_start_year_greater_than_end_year(self):
        response = self.client.post(
            self.BASE_URL, {"name": "Invalid Scenario", "start_year": 2027, "end_year": 2026}, format="json"
        )
        jsonResponse = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(jsonResponse["start_year"], ["Start year should be lower or equal end year."])
        self.assertEqual(Scenario.objects.count(), 1)

    def test_scenario_create_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(self.BASE_URL, {"name": "New Scenario", "start_year": 2025, "end_year": 2026}, format="json")
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

    def test_scenario_update_name_already_taken(self):
        self.scenario2 = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_full_perm,
            name="Test Scenario 2",
            description="A test scenario 2 description.",
            start_year=2025,
            end_year=2026,
        )
        payload = {"id": self.scenario.id, "name": "Test Scenario 2", "start_year": 2025, "end_year": 2026}
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.put(f"{self.BASE_URL}{self.scenario.id}/", payload, format="json")
        json_response = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(jsonResponse["name"], ["A scenario with this name already exists for your account."])

    def test_scenario_update_start_year_greater_than_end_year(self):
        payload = {"id": self.scenario.id, "name": "Test Scenario", "start_year": 2027, "end_year": 2026}
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.put(f"{self.BASE_URL}{self.scenario.id}/", payload, format="json")
        json_response = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(json_response, ["Start year should be lower or equal end year."])

    def test_scenario_duplicate_with_full_perm(self):
        self.client.force_authenticate(self.user_with_full_perm)
        response = self.client.post(f"{self.BASE_URL}duplicate/", {"id_to_duplicate": self.scenario.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.count(), 2)
        duplicated_scenario = Scenario.objects.latest("id")
        self.assertIn(f"Copy of {self.scenario.name}", duplicated_scenario.name)
        self.assertEqual(duplicated_scenario.intervention_assignments.count(), 3)

    def test_scenario_duplicate_with_basic_perm(self):
        payload = {
            "scenario_to_duplicate": self.scenario.id,
            "name": f"Copy of {self.scenario.name}",
            "description": self.scenario.description,
            "start_year": 2025,
            "end_year": 2026,
        }
        response = self.client.post(url, payload, format="json")
        self.client.force_authenticate(self.user_with_basic_perm)
        response = self.client.post(f"{self.BASE_URL}duplicate/", {"id_to_duplicate": self.scenario.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.count(), 2)
        duplicated_scenario = Scenario.objects.latest("id")
        self.assertIn(f"Copy of {self.scenario.name}", duplicated_scenario.name)
        self.assertEqual(duplicated_scenario.intervention_assignments.count(), 3)
        self.assertEqual(duplicated_scenario.created_by, self.user)
        self.assertEqual(duplicated_scenario.account, self.account)
        self.assertEqual(duplicated_scenario.start_year, self.scenario.start_year)
        self.assertEqual(duplicated_scenario.end_year, self.scenario.end_year)
        self.assertEqual(duplicated_scenario.description, self.scenario.description)
        self.assertEqual(duplicated_scenario.name, payload["name"])

    def test_scenario_duplicate_no_perms(self):
        self.client.force_authenticate(self.user_no_perms)
        response = self.client.post(f"{self.BASE_URL}duplicate/", {"id_to_duplicate": self.scenario.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Scenario.objects.count(), 1)

    def test_scenario_duplicate_unauthenticated(self):
        response = self.client.post(f"{self.BASE_URL}duplicate/", {"id_to_duplicate": self.scenario.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_scenario_duplicate_missing_body(self):
        url = reverse("scenarios-duplicate")
        response = self.client.post(url, format="json")
        json_result = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)

        self.assertEqual(json_result["name"][0], "This field is required.")
        self.assertEqual(json_result["start_year"][0], "This field is required.")
        self.assertEqual(json_result["end_year"][0], "This field is required.")

        self.assertEqual(Scenario.objects.count(), 1)

    def test_scenario_duplicate_multiple_times_success(self):
        # First duplication
        response = self.client.post(f"{self.BASE_URL}duplicate/", {"id_to_duplicate": self.scenario.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.count(), 2)
        duplicated_scenario = Scenario.objects.latest("id")

        self.assertIn(f"Copy of {self.scenario.name}", duplicated_scenario.name)
        self.assertEqual(duplicated_scenario.intervention_assignments.count(), 3)

        # Second duplication
        response = self.client.post(f"{self.BASE_URL}duplicate/", {"id_to_duplicate": self.scenario.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.count(), 3)
        duplicated_scenario = Scenario.objects.latest("id")

        self.assertIn(f"Copy of {self.scenario.name}", duplicated_scenario.name)
        self.assertEqual(duplicated_scenario.intervention_assignments.count(), 3)

    def test_scenario_export_to_csv(self):
        url = f"/api/snt_malaria/scenarios/export_to_csv/?id={self.scenario.id}"
        response = self.client.get(url)

        csv_list = self.assertCsvFileResponse(response, return_as_lists=True)
        self.assertEqual(len(csv_list), 3)  # Headers + 2 org units
        csv_headers = csv_list[0]
        csv_district_1 = csv_list[1]
        csv_district_2 = csv_list[2]

        self.assertSequenceEqual(
            csv_headers, ["org_unit_id", "org_unit_name", "IPTp - iptp", "RTS,S - rts_s", "SMC - smc"]
        )
        self.assertSequenceEqual(csv_district_1, [str(self.district1.id), self.district1.name, "1", "0", "0"])
        self.assertSequenceEqual(csv_district_2, [str(self.district2.id), self.district2.name, "0", "1", "1"])

    def test_scenario_export_to_csv_no_scenario_id_returns_template(self):
        url = "/api/snt_malaria/scenarios/export_to_csv/"
        response = self.client.get(url)

        csv_list = self.assertCsvFileResponse(response, return_as_lists=True)
        self.assertEqual(len(csv_list), 3)  # Headers + 2 org units
        csv_headers = csv_list[0]
        csv_district_1 = csv_list[1]
        csv_district_2 = csv_list[2]

        self.assertSequenceEqual(
            csv_headers, ["org_unit_id", "org_unit_name", "IPTp - iptp", "RTS,S - rts_s", "SMC - smc"]
        )
        self.assertSequenceEqual(csv_district_1, [str(self.district1.id), self.district1.name, "0", "0", "0"])
        self.assertSequenceEqual(csv_district_2, [str(self.district2.id), self.district2.name, "0", "0", "0"])

    def test_scenario_export_to_csv_unauthenticated(self):
        self.client.force_authenticate(user=self.anon)
        url = f"/api/snt_malaria/scenarios/export_to_csv/?id={self.scenario.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_scenario_export_to_csv_non_existing_scenario(self):
        url = f"/api/snt_malaria/scenarios/export_to_csv/?id={self.scenario.id + 1}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_scenario_export_to_csv_no_acces_to_scenario(self):
        wrong_account = Account.objects.create(name="Test Account Invalid")
        wrong_user = self.create_user_with_profile(username="testuserinvalid", account=wrong_account)
        self.client.force_authenticate(user=wrong_user)

        url = f"/api/snt_malaria/scenarios/export_to_csv/?id={self.scenario.id + 1}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_scenario_import_csv_unauthenticated(self):
        self.client.force_authenticate(user=None)
        url = "/api/snt_malaria/scenarios/import_from_csv/"
        response = self.client.post(url, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_scenario_import_csv_missing_file(self):
        url = "/api/snt_malaria/scenarios/import_from_csv/"
        response = self.client.post(url, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)
        self.assertEqual(str(response.data["file"][0]), "No file was submitted.")

    def test_scenario_import_csv_invalid_file_type(self):
        url = "/api/snt_malaria/scenarios/import_from_csv/"
        invalid_file = SimpleUploadedFile("test.txt", b"Invalid content", content_type="text/plain")
        response = self.client.post(url, {"file": invalid_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)
        self.assertEqual(str(response.data["file"][0]), "The file must be a CSV.")

    def test_scenario_import_csv_missing_org_unit_id_column(self):
        url = "/api/snt_malaria/scenarios/import_from_csv/"
        csv_content = b"org_unit_name,IPTp - iptp,RTS,S - rts_s,SMC - smc\nDistrict 1,1,0,0\nDistrict 2,0,1,1\n"
        invalid_file = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")
        response = self.client.post(url, {"file": invalid_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)
        self.assertEqual(str(response.data["file"][0]), "The CSV must contain an 'org_unit_id' column.")

    def test_scenario_import_csv_missing_header(self):
        url = "/api/snt_malaria/scenarios/import_from_csv/"
        csv_content = (
            'org_unit_id,org_unit_name,IPTp - iptp,"RTS,S - rts_s"\n'
            f"{self.district1.id},District 1,1,0\n"
            f"{self.district2.id},District 2,0,1\n"
        )

        valid_file = SimpleUploadedFile("test.csv", csv_content.encode(), content_type="text/csv")
        response = self.client.post(url, {"file": valid_file}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)
        self.assertIn("header_errors", response.data["file"])
        self.assertIn("SMC - smc", response.data["file"]["header_errors"])

    def test_scenario_import_csv_no_assignments(self):
        url = "/api/snt_malaria/scenarios/import_from_csv/"
        csv_content = (
            'org_unit_id,org_unit_name,"IPTp - iptp","RTS,S - rts_s","SMC - smc"\n'
            f"{self.district1.id},District 1,0,0,0\n"
            f"{self.district2.id},District 2,0,0,0\n"
        )

        valid_file = SimpleUploadedFile("test.csv", csv_content.encode(), content_type="text/csv")
        response = self.client.post(url, {"file": valid_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(str(response.data[0]), "No assignments to create from the provided CSV data.")

    def test_scenario_import_csv_org_unit_not_found(self):
        url = "/api/snt_malaria/scenarios/import_from_csv/"
        csv_content = 'org_unit_id,org_unit_name,IPTp - iptp,"RTS,S - rts_s",SMC - smc\n9999,District Unknown,1,0,0\n'

        valid_file = SimpleUploadedFile("test.csv", csv_content.encode(), content_type="text/csv")
        response = self.client.post(url, {"file": valid_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)
        self.assertIn("not_found_org_units", response.data["file"])
        self.assertIn("9999", response.data["file"]["not_found_org_units"])
        self.assertIn("missing_org_units_from_file", response.data["file"])
        self.assertIn(str(self.district1.id), response.data["file"]["missing_org_units_from_file"])
        self.assertIn(str(self.district2.id), response.data["file"]["missing_org_units_from_file"])

    def test_scenario_import_csv_success(self):
        url = "/api/snt_malaria/scenarios/import_from_csv/"
        csv_content = (
            'org_unit_id,org_unit_name,IPTp - iptp,"RTS,S - rts_s",SMC - smc\n'
            f"{self.district1.id},District 1,1,0,0\n"
            f"{self.district2.id},District 2,0,1,1\n"
        )

        valid_file = SimpleUploadedFile("test.csv", csv_content.encode(), content_type="text/csv")
        response = self.client.post(url, {"file": valid_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)

        # Verify that the scenario and assignments were created
        new_scenario = Scenario.objects.get(id=response.data["id"])
        self.assertEqual(new_scenario.intervention_assignments.count(), 3)

        assignments_district_1 = InterventionAssignment.objects.filter(scenario=new_scenario, org_unit=self.district1)
        assignments_district_2 = InterventionAssignment.objects.filter(scenario=new_scenario, org_unit=self.district2)

        self.assertEqual(assignments_district_1.count(), 1)
        self.assertEqual(assignments_district_1.first().intervention, self.intervention_chemo_iptp)

        self.assertEqual(assignments_district_2.count(), 2)
        intervention_ids_district_2 = set(assignments_district_2.values_list("intervention_id", flat=True))
        self.assertSetEqual(
            intervention_ids_district_2,
            {self.intervention_vaccination_rts.id, self.intervention_chemo_smc.id},
        )
