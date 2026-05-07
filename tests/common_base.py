from itertools import count

from django.utils.text import slugify

from iaso.models import Account, OrgUnit, OrgUnitType
from iaso.test import APITestCase, TestCase
from plugins.snt_malaria.models import (
    BudgetAssumptions,
    Intervention,
    InterventionAssignment,
    InterventionCategory,
    Scenario,
)


class SNTMalariaTestMixin:
    auto_create_account = True

    def setUp(self):
        self._account_counter = count(1)
        self._user_counter = count(1)
        self._scenario_counter = count(1)
        self._category_counter = count(1)
        self._intervention_counter = count(1)
        self._org_unit_counter = count(1)
        if self.auto_create_account:
            self.account, self.user = self.create_snt_account(name="Test Account")
        else:
            self.account = None
            self.user = None

    def create_snt_account(self, name=None, username=None, permissions=None):
        account_number = next(self._account_counter)
        user_number = next(self._user_counter)
        account = Account.objects.create(name=name or f"Test Account {account_number}")
        user = self.create_user_with_profile(
            username=username or f"testuser{user_number}",
            account=account,
            permissions=permissions or [],
        )
        return account, user

    def create_snt_account_with_project(
        self,
        source_name="source",
        account_name=None,
        project_name="project",
        username=None,
        permissions=None,
    ):
        account_number = next(self._account_counter)
        user_number = next(self._user_counter)
        account_name = account_name or f"Test Account {account_number}"
        account, source, version, project = self.create_account_datasource_version_project(
            source_name,
            account_name,
            project_name,
        )
        user = self.create_user_with_profile(
            username=username or f"testuser{user_number}",
            account=account,
            permissions=permissions or [],
        )
        return account, user, source, version, project

    def create_snt_scenario(self, account=None, created_by=None, name=None, **kwargs):
        scenario_number = next(self._scenario_counter)
        return Scenario.objects.create(
            account=account or self.account,
            created_by=created_by or self.user,
            name=name or f"Test Scenario {scenario_number}",
            description=kwargs.pop("description", "A test scenario description."),
            start_year=kwargs.pop("start_year", 2025),
            end_year=kwargs.pop("end_year", 2028),
            **kwargs,
        )

    def create_snt_org_unit_type(self, name="DISTRICT"):
        return OrgUnitType.objects.create(name=name)

    def create_snt_org_unit(self, org_unit_type=None, name=None, **kwargs):
        org_unit_number = next(self._org_unit_counter)
        return OrgUnit.objects.create(
            org_unit_type=org_unit_type or self.create_snt_org_unit_type(),
            name=name or f"District {org_unit_number}",
            **kwargs,
        )

    def create_snt_intervention_category(self, account=None, created_by=None, name=None, **kwargs):
        category_number = next(self._category_counter)
        return InterventionCategory.objects.create(
            account=account or self.account,
            created_by=created_by or self.user,
            name=name or f"Test Intervention Category {category_number}",
            **kwargs,
        )

    def create_snt_intervention(
        self,
        intervention_category=None,
        created_by=None,
        name=None,
        code=None,
        short_name=None,
        **kwargs,
    ):
        intervention_number = next(self._intervention_counter)
        name = name or f"Test Intervention {intervention_number}"
        short_name = short_name if short_name is not None else name
        return Intervention.objects.create(
            intervention_category=intervention_category or self.create_snt_intervention_category(),
            created_by=created_by or self.user,
            name=name,
            short_name=short_name,
            code=code if code is not None else slugify(short_name).replace("-", "_"),
            **kwargs,
        )

    def create_snt_assignment(self, scenario, org_unit, intervention, created_by=None, **kwargs):
        return InterventionAssignment.objects.create(
            scenario=scenario,
            org_unit=org_unit,
            intervention=intervention,
            created_by=created_by or getattr(scenario, "created_by", self.user),
            **kwargs,
        )

    def create_snt_budget_assumption(self, scenario, intervention_assignment, year, coverage, **kwargs):
        return BudgetAssumptions.objects.create(
            scenario=scenario,
            intervention_assignment=intervention_assignment,
            year=year,
            coverage=coverage,
            **kwargs,
        )

    def create_snt_default_interventions(self, account=None, created_by=None):
        """Create the default Vaccination/Chemotherapy categories and RTS,S/SMC/IPTp interventions.

        Returns a dict with keys: category_vaccination, category_chemoprevention,
        intervention_rts, intervention_smc, intervention_iptp, intervention_itn_campaign.
        """
        account = account or self.account
        created_by = created_by or self.user

        category_vaccination = self.create_snt_intervention_category(
            name="Vaccination",
            account=account,
            created_by=created_by,
        )
        category_campaign = self.create_snt_intervention_category(
            name="Campaign",
            account=account,
            created_by=created_by,
        )
        category_chemoprevention = self.create_snt_intervention_category(
            name="Preventive Chemotherapy",
            account=account,
            created_by=created_by,
        )
        intervention_rts = self.create_snt_intervention(
            name="RTS,S",
            short_name="RTS,S",
            code="rts_s",
            intervention_category=category_vaccination,
            created_by=created_by,
        )
        intervention_smc = self.create_snt_intervention(
            name="SMC",
            short_name="SMC",
            code="smc",
            intervention_category=category_chemoprevention,
            created_by=created_by,
        )
        intervention_iptp = self.create_snt_intervention(
            name="IPTp",
            short_name="IPTp",
            code="iptp",
            intervention_category=category_chemoprevention,
            created_by=created_by,
        )

        intervention_itn_campaign = self.create_snt_intervention(
            name="ITN Campaign",
            short_name="ITN Campaign",
            code="itn_campaign",
            intervention_category=category_campaign,
            created_by=created_by,
        )
        return {
            "category_vaccination": category_vaccination,
            "category_chemoprevention": category_chemoprevention,
            "intervention_rts": intervention_rts,
            "intervention_smc": intervention_smc,
            "intervention_iptp": intervention_iptp,
            "intervention_itn_campaign": intervention_itn_campaign,
        }

    def create_snt_default_interventions_setup(
        self,
        scenario,
        account=None,
        created_by=None,
        org_unit_type_name="DISTRICT",
    ):
        # This does the same as create_snt_default_interventions
        # but also creates org units and assignments for the RTS,S and SMC interventions,

        account = account or getattr(scenario, "account", self.account)
        created_by = created_by or getattr(scenario, "created_by", self.user)

        defaults = self.create_snt_default_interventions(account=account, created_by=created_by)
        category_vaccination = defaults["category_vaccination"]
        category_chemoprevention = defaults["category_chemoprevention"]
        intervention_rts = defaults["intervention_rts"]
        intervention_smc = defaults["intervention_smc"]
        intervention_iptp = defaults["intervention_iptp"]
        intervention_itn_campaign = defaults["intervention_itn_campaign"]

        org_unit_type = self.create_snt_org_unit_type(name=org_unit_type_name)
        district_1 = self.create_snt_org_unit(org_unit_type=org_unit_type, name="District 1")
        district_2 = self.create_snt_org_unit(org_unit_type=org_unit_type, name="District 2")

        assignment_a = self.create_snt_assignment(scenario, district_1, intervention_rts, created_by=created_by)
        assignment_b = self.create_snt_assignment(scenario, district_2, intervention_smc, created_by=created_by)
        assignment_iptp = self.create_snt_assignment(scenario, district_1, intervention_iptp, created_by=created_by)
        assignment_itn_campaign = self.create_snt_assignment(
            scenario, district_2, intervention_itn_campaign, created_by=created_by
        )
        return {
            "category_vaccination": category_vaccination,
            "category_chemoprevention": category_chemoprevention,
            "intervention_rts": intervention_rts,
            "intervention_smc": intervention_smc,
            "intervention_iptp": intervention_iptp,
            "org_unit_type": org_unit_type,
            "district_1": district_1,
            "district_2": district_2,
            "assignment_a": assignment_a,
            "assignment_b": assignment_b,
            "assignment_iptp": assignment_iptp,
            "assignment_itn_campaign": assignment_itn_campaign,
        }


class SNTMalariaTestCase(SNTMalariaTestMixin, TestCase):
    def setUp(self):
        super().setUp()


class SNTMalariaAPITestCase(SNTMalariaTestMixin, APITestCase):
    def setUp(self):
        super().setUp()
