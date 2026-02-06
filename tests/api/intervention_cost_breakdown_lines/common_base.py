from iaso.models import Account
from iaso.test import APITestCase
from plugins.snt_malaria.models import Intervention, InterventionCategory, InterventionCostBreakdownLine
from plugins.snt_malaria.permissions import SNT_SETTINGS_READ_PERMISSION, SNT_SETTINGS_WRITE_PERMISSION


class InterventionCostBreakdownLineBase(APITestCase):
    BASE_URL = "/api/snt_malaria/intervention_cost_breakdown_lines/"

    def setUp(self):
        self.account = Account.objects.create(name="Test Account")
        self.user_write, self.anon, self.user_no_perm = self.create_base_users(
            self.account, [SNT_SETTINGS_WRITE_PERMISSION], "admin"
        )
        self.user_read = self.create_user_with_profile(
            username="user_read", account=self.account, permissions=[SNT_SETTINGS_READ_PERMISSION]
        )
        self.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=self.account,
            created_by=self.user_write,
        )
        self.int_category_chemoprevention = InterventionCategory.objects.create(
            name="Preventive Chemotherapy",
            account=self.account,
            created_by=self.user_write,
        )
        self.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=self.user_write,
            intervention_category=self.int_category_vaccination,
            code="rts_s",
        )
        self.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=self.user_write,
            intervention_category=self.int_category_chemoprevention,
            code="smc",
        )
        self.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=self.user_write,
            intervention_category=self.int_category_chemoprevention,
            code="iptp",
        )
        self.cost_line1 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 1",
            intervention=self.intervention_vaccination_rts,
            unit_cost=10,
            category="Procurement",
            created_by=self.user_write,
            year=2025,
        )
        self.cost_line2 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 2",
            intervention=self.intervention_chemo_smc,
            unit_cost=5,
            category="Procurement",
            created_by=self.user_write,
            year=2025,
        )
        self.cost_line3 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 3",
            intervention=self.intervention_chemo_smc,
            unit_cost=5.55,
            category="Supportive",
            created_by=self.user_write,
            year=2026,
        )
        self.cost_line4 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 4",
            intervention=self.intervention_chemo_smc,
            unit_cost=5.55,
            category="Supportive",
            created_by=self.user_write,
            year=2026,
        )

        # Preparing second setup to test tenancy
        self.other_account = Account.objects.create(name="Other Test Account")
        self.other_user = self.create_user_with_profile(
            username="otheruser", account=self.other_account, permissions=[SNT_SETTINGS_WRITE_PERMISSION]
        )
        self.other_int_category = InterventionCategory.objects.create(
            name="Other Category",
            account=self.other_account,
            created_by=self.other_user,
        )
        self.other_intervention = Intervention.objects.create(
            name="Other Intervention",
            created_by=self.other_user,
            intervention_category=self.other_int_category,
            code="other_int",
        )
        self.other_cost_line = InterventionCostBreakdownLine.objects.create(
            name="Other Cost Line",
            intervention=self.other_intervention,
            unit_cost=20,
            category="Operational",
            created_by=self.other_user,
            year=2025,
        )
