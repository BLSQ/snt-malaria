from django.urls import reverse
from rest_framework import status

from iaso.models import Account, OrgUnit, OrgUnitType
from iaso.test import APITestCase
from plugins.snt_malaria.models import Intervention, InterventionAssignment, InterventionCategory, Scenario


class ScenarioAPITestCase(APITestCase):
    def setUp(cls):
        # Create a user and account for testing
        cls.account = Account.objects.create(name="Test Account")
        cls.user = cls.create_user_with_profile(username="testuser", account=cls.account)

        # Create a scenario
        cls.scenario = Scenario.objects.create(
            account=cls.account,
            created_by=cls.user,
            name="Test Scenario",
            description="A test scenario description.",
        )
        cls.scenario2 = Scenario.objects.create(
            account=cls.account,
            created_by=cls.user,
            name="Test Scenario 2",
            description="A test scenario 2 description.",
        )

        # Create intervention categories
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

        # Create interventions
        cls.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=cls.user,
            intervention_category=cls.int_category_vaccination,
        )
        cls.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
        )
        cls.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=cls.user,
            intervention_category=cls.int_category_chemoprevention,
        )

        # Create Org Units
        cls.out_district = OrgUnitType.objects.create(name="DISTRICT")
        cls.district1 = OrgUnit.objects.create(org_unit_type=cls.out_district, name="District 1")
        cls.district2 = OrgUnit.objects.create(org_unit_type=cls.out_district, name="District 2")

        # Create assignments related to the scenario
        cls.assignment = InterventionAssignment.objects.create(
            scenario=cls.scenario,
            org_unit=cls.district1,
            intervention=cls.intervention_chemo_iptp,
            created_by=cls.user,
        )
        cls.assignment = InterventionAssignment.objects.create(
            scenario=cls.scenario,
            org_unit=cls.district2,
            intervention=cls.intervention_chemo_smc,
            created_by=cls.user,
        )
        cls.assignment = InterventionAssignment.objects.create(
            scenario=cls.scenario,
            org_unit=cls.district2,
            intervention=cls.intervention_vaccination_rts,
            created_by=cls.user,
        )

        cls.client.force_authenticate(user=cls.user)

    def test_scenario_list(self):
        url = reverse("scenarios-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        scenario = next(item for item in response.data if item["id"] == self.scenario.id)
        self.assertEqual(scenario["name"], "Test Scenario")
        self.assertEqual(scenario["description"], "A test scenario description.")
        self.assertEqual(scenario["created_by"]["id"], self.user.id)
        scenario2 = next(item for item in response.data if item["id"] == self.scenario2.id)
        self.assertEqual(scenario2["name"], "Test Scenario 2")
        self.assertEqual(scenario2["description"], "A test scenario 2 description.")
        self.assertEqual(scenario2["created_by"]["id"], self.user.id)

    def test_scenario_retrieve(self):
        url = reverse("scenarios-detail", args=[self.scenario.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Test Scenario")
        self.assertEqual(response.data["description"], "A test scenario description.")
        self.assertEqual(response.data["created_by"]["id"], self.user.id)

    def test_scenario_create(self):
        url = reverse("scenarios-list")
        response = self.client.post(url, {"name": "New Scenario"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.count(), 3)
        new_scenario = Scenario.objects.latest("id")
        self.assertEqual(new_scenario.name, "New Scenario")
        self.assertEqual(new_scenario.account, self.account)
        self.assertEqual(new_scenario.created_by, self.user)

    def test_scenario_update(self):
        url = reverse("scenarios-detail", args=[self.scenario.id])
        payload = {"id": self.scenario.id, "name": "Updated Scenario Name"}
        response = self.client.put(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.name, "Updated Scenario Name")

    def test_scenario_update_name_already_taken(self):
        url = reverse("scenarios-detail", args=[self.scenario.id])
        payload = {"id": self.scenario.id, "name": "Test Scenario 2"}
        response = self.client.put(url, payload, format="json")
        jsonResponse = self.assertJSONResponse(response, status.HTTP_400_BAD_REQUEST)
        print(jsonResponse)
        self.assertEqual(jsonResponse, {"name": ["Scenario with this name already exists."]})

    def test_scenario_duplicate_success(self):
        url = reverse("scenarios-duplicate")
        response = self.client.post(url, {"id_to_duplicate": self.scenario.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.count(), 3)
        duplicated_scenario = Scenario.objects.latest("id")
        self.assertIn(f"Copy of {self.scenario.name}", duplicated_scenario.name)
        self.assertEqual(duplicated_scenario.intervention_assignments.count(), 3)

    def test_scenario_duplicate_missing_body(self):
        url = reverse("scenarios-duplicate")
        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(str(response.data["id_to_duplicate"][0]), "This field is required.")
        self.assertEqual(Scenario.objects.count(), 2)

    def test_scenario_duplicate_multiple_times_success(self):
        url = reverse("scenarios-duplicate")

        # First duplication
        response = self.client.post(url, {"id_to_duplicate": self.scenario.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.count(), 3)
        duplicated_scenario = Scenario.objects.latest("id")

        self.assertIn(f"Copy of {self.scenario.name}", duplicated_scenario.name)
        self.assertEqual(duplicated_scenario.intervention_assignments.count(), 3)

        # Second duplication
        response = self.client.post(url, {"id_to_duplicate": self.scenario.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scenario.objects.count(), 4)
        duplicated_scenario = Scenario.objects.latest("id")

        self.assertIn(f"Copy of {self.scenario.name}", duplicated_scenario.name)
        self.assertEqual(duplicated_scenario.intervention_assignments.count(), 3)
