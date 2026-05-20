from plugins.snt_malaria.models import InterventionCostBreakdownLine
from plugins.snt_malaria.permissions import SNT_SETTINGS_READ_PERMISSION, SNT_SETTINGS_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


class InterventionCostBreakdownLineBase(SNTMalariaAPITestCase):
    BASE_URL = "/api/snt_malaria/intervention_cost_breakdown_lines/"
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.user = self.create_snt_account(name="Test Account")
        self.user_write, self.anon, self.user_no_perm = self.create_base_users(
            self.account, [SNT_SETTINGS_WRITE_PERMISSION], "admin"
        )
        self.user_read = self.create_user_with_profile(
            username="user_read", account=self.account, permissions=[SNT_SETTINGS_READ_PERMISSION]
        )
        defaults = self.create_snt_default_interventions(account=self.account, created_by=self.user_write)
        self.int_category_vaccination = defaults["category_vaccination"]
        self.int_category_chemoprevention = defaults["category_chemoprevention"]
        self.intervention_vaccination_rts = defaults["intervention_rts"]
        self.intervention_chemo_smc = defaults["intervention_smc"]
        self.intervention_chemo_iptp = defaults["intervention_iptp"]
        self.cost_line1 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 1",
            intervention=self.intervention_vaccination_rts,
            unit_cost=10,
            category="Procurement",
            created_by=self.user_write,
        )
        self.cost_line2 = InterventionCostBreakdownLine.objects.create(
            name="Cost Line 2",
            intervention=self.intervention_chemo_smc,
            unit_cost=5,
            category="Procurement",
            created_by=self.user_write,
        )

        # Preparing second setup to test tenancy
        self.other_account, self.other_user = self.create_snt_account(name="Other Test Account")
        self.other_user = self.create_user_with_profile(
            username="otheruser", account=self.other_account, permissions=[SNT_SETTINGS_WRITE_PERMISSION]
        )
        other_defaults = self.create_snt_default_interventions(account=self.other_account, created_by=self.other_user)
        self.other_int_category = other_defaults["category_vaccination"]
        self.other_intervention = other_defaults["intervention_rts"]
        self.other_cost_line = InterventionCostBreakdownLine.objects.create(
            name="Other Cost Line",
            intervention=self.other_intervention,
            unit_cost=20,
            category="Operational",
            created_by=self.other_user,
        )
