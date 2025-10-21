from rest_framework import status

from iaso.models.base import Account
from iaso.test import APITestCase
from plugins.snt_malaria.models.intervention import Intervention, InterventionCategory


BASE_URL = "/api/snt_malaria/interventions/"


class InterventionAPITests(APITestCase):
    def setUp(cls):
        cls.account = Account.objects.create(name="Test Account 3")
        cls.user = cls.create_user_with_profile(username="testuserintervention", account=cls.account)
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

    def test_list_interventions_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        rts_intervention = next(
            (item for item in response.data if item["id"] == self.intervention_vaccination_rts.id), None
        )
        self.assertIsNotNone(rts_intervention)

    def test_list_intervention_unauthenticated(self):
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
