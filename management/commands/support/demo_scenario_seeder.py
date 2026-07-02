"""
Create a demo scenario with intervention assignments for Burkina Faso
"""

from datetime import date
from decimal import Decimal

from iaso.models import OrgUnitType, User
from iaso.models.data_store import JsonDataStore
from iaso.models.metric import MetricType, MetricValue

# from plugins.snt_malaria.models.budget import Budget
from plugins.snt_malaria.models.cost_breakdown import InterventionCostBreakdownLine
from plugins.snt_malaria.models.intervention import Intervention
from plugins.snt_malaria.models.scenario import Scenario, ScenarioRule
from plugins.snt_malaria.models.scenario_yearly_cost_assignment import ScenarioYearlyCostAssignment
from plugins.snt_malaria.services.budget.budget_calculation import BudgetCalculationService


# Coverage ratios stored in ScenarioYearlyCostAssignment.value for population-driven lines.
# Keyed by intervention.code; unrecognised codes fall back to DEFAULT_YEARLY_COVERAGE.
YEARLY_COVERAGE_BY_CODE = {
    "iptp": Decimal("0.85"),
    "pmc": Decimal("0.80"),
    "smc": Decimal("0.90"),
    "smc_3": Decimal("0.90"),
    "smc_4": Decimal("0.90"),
    "smc_5": Decimal("0.90"),
    "itn_campaign": Decimal("0.75"),
    "itn_routine": Decimal("0.80"),
    "itn_school": Decimal("0.75"),
    "vacc": Decimal("0.70"),
    "lsm": Decimal("0.80"),
}
DEFAULT_YEARLY_COVERAGE = Decimal("1.00")


class DemoScenarioSeeder:
    def __init__(self, account, project, stdout_writer=None):
        self.account = account
        self.project = project
        self.stdout_write = stdout_writer or print

    def create_scenario(self):
        """
        Create a demo scenario with intervention assignments based on org units and interventions.
        """
        # Check if a demo scenario already exists
        if Scenario.objects.filter(account=self.account, name__icontains="Demo").exists():
            self.stdout_write(f"Skipping scenario creation for {self.account.name}, demo scenario already exists")
            return

        self.stdout_write(f"Creating demo scenario for account {self.account.name}:")

        # Get the first user associated with this account
        created_by = User.objects.filter(iaso_profile__account=self.account).first()
        if not created_by:
            self.stdout_write("ERROR: No user found for this account")
            return

        # Get all interventions for this account
        interventions = Intervention.objects.filter(intervention_category__account=self.account).select_related(
            "intervention_category"
        )

        if not interventions.exists():
            self.stdout_write("WARNING: No interventions found for this account. Run intervention_seeder first.")
            return

        metric_types = MetricType.objects.filter(
            account=self.account, code__in=["PF_PR_RATE", "SEASONALITY_PRECIPITATION"]
        )
        pf_rate_metric_type = metric_types.filter(code="PF_PR_RATE").first()
        seasonality_precipitation_metric_type = metric_types.filter(code="SEASONALITY_PRECIPITATION").first()

        self._create_scenario_(
            "NSP 1", created_by, interventions, seasonality_precipitation_metric_type, pf_rate_metric_type, rate=60
        )
        self._create_scenario_(
            "NSP 2", created_by, interventions, seasonality_precipitation_metric_type, pf_rate_metric_type, rate=80
        )

        # Create an SNT config
        country_out_id = OrgUnitType.objects.get(projects=self.project, short_name="Country").id
        district_out_id = OrgUnitType.objects.get(projects=self.project, short_name="District").id
        JsonDataStore.objects.create(
            slug="snt_malaria_config",
            account=self.account,
            content={
                "country_org_unit_type_id": country_out_id,
                "intervention_org_unit_type_id": district_out_id,
            },
        )

        self.stdout_write("Done creating demo scenario.")

    def _create_scenario_(
        self, scenario_name, user, interventions, seasonality_precipitation_metric_type, pf_rate_metric_type, rate
    ):
        # Create the demo scenario
        current_year = date.today().year + 1
        scenario = Scenario.objects.create(
            account=self.account,
            created_by=user,
            name=f"Demo {scenario_name}",
            description=(
                "This is a demonstration scenario for Burkina Faso showing various malaria "
                "intervention strategies across different districts. The scenario includes "
                "a mix of preventive measures (ITNs, SMC, IPTp), case management, and vaccination interventions."
            ),
            start_year=current_year,
            end_year=current_year + 4,
        )
        self.stdout_write(f"Created scenario: {scenario.name}")

        self.stdout_write("Create rule for all org units...")

        def create_rule(**kwargs):
            matching_criteria = kwargs.get("matching_criteria")
            org_units_matched = ScenarioRule.resolve_matched_org_units(self.account, matching_criteria)
            return ScenarioRule.objects.create(org_units_matched=org_units_matched, **kwargs)

        all_orgunits_rules = create_rule(
            scenario=scenario,
            name="CM + IPTp",
            created_by=user,
            priority=1,
            color="#26C6DA",
            matching_criteria={"all": True},
        )

        matching_criteria_seasonal = {
            "and": [
                {"==": [{"var": seasonality_precipitation_metric_type.id}, "seasonal"]},
            ]
        }

        smc_rule = create_rule(
            scenario=scenario,
            name="SMC",
            created_by=user,
            priority=2,
            color="#42A5F5",
            matching_criteria=matching_criteria_seasonal,
        )

        matching_criteria_low = {
            "and": [
                {"<=": [{"var": pf_rate_metric_type.id}, rate]},
            ]
        }

        matching_criteria_high = {
            "and": [
                {">": [{"var": pf_rate_metric_type.id}, rate]},
            ]
        }

        itn_dual_ai_rule = create_rule(
            scenario=scenario,
            name="ITN - Dual AI",
            created_by=user,
            priority=3,
            color="#D4E157",
            matching_criteria=matching_criteria_high,
        )

        itn_pbo_rule = create_rule(
            scenario=scenario,
            name="ITN - PBO",
            created_by=user,
            priority=4,
            color="#F4511E",
            matching_criteria=matching_criteria_low,
        )

        self.stdout_write("Linking interventions to scenario rules...")

        all_orgunits_rules.interventions.add(
            interventions.get(code="cm_public"),
            interventions.filter(code="iptp").first(),
        )
        smc_rule.interventions.add(interventions.get(code="smc", name="SMC (SP+AQ)"))
        itn_dual_ai_rule.interventions.add(interventions.get(code="itn_routine", name="Dual AI"))
        itn_pbo_rule.interventions.add(interventions.get(code="itn_routine", name="PBO"))

        self.stdout_write("Assign interventions to scenario...")
        scenario.refresh_assignments(user=user)
        assignment_count = scenario.intervention_assignments.count()
        self.stdout_write(f"Assigned {assignment_count} interventions to scenario")

        self._create_yearly_cost_assignments(scenario)

        self._ensure_population_for_scenario_years(scenario)

        self.stdout_write(f"Calculating budget for '{scenario.name}'...")
        budget = BudgetCalculationService(scenario).calculate_and_save_all_years(user)
        self.stdout_write(f"Created budget '{budget.name}' (ID: {budget.id})")

        return scenario

    def _create_yearly_cost_assignments(self, scenario):
        """Create ScenarioYearlyCostAssignment rows for all cost breakdown lines of
        the interventions assigned to the scenario, one row per (line, year)."""
        intervention_ids = list(scenario.intervention_assignments.values_list("intervention_id", flat=True).distinct())

        cost_lines = InterventionCostBreakdownLine.objects.filter(intervention_id__in=intervention_ids).select_related(
            "intervention"
        )

        to_create = []
        for year in range(scenario.start_year, scenario.end_year + 1):
            for line in cost_lines:
                if line.is_fixed_cost:
                    # Fixed-cost lines default to 0 in the budget calculator; seed an explicit 0
                    value = Decimal("0.00")
                else:
                    value = YEARLY_COVERAGE_BY_CODE.get(line.intervention.code, DEFAULT_YEARLY_COVERAGE)
                to_create.append(
                    ScenarioYearlyCostAssignment(
                        scenario=scenario,
                        cost_line=line,
                        year=year,
                        value=value,
                    )
                )

        ScenarioYearlyCostAssignment.objects.bulk_create(to_create, ignore_conflicts=True)
        self.stdout_write(f"Created {len(to_create)} yearly cost assignments for '{scenario.name}'")

    def _ensure_population_for_scenario_years(self, scenario):
        """The metrics dataset has no YEAR column so MetricValues are imported with year=0.
        The budget calculator queries by exact year, so copy the year=0 baseline values to
        every year in the scenario range so the calculation produces non-zero results."""
        pop_metric_types = MetricType.objects.filter(
            account=scenario.account,
            metric_kind=MetricType.MetricKind.POPULATION,
        )

        base_values = list(MetricValue.objects.filter(metric_type__in=pop_metric_types, year=0))
        if not base_values:
            self.stdout_write("WARNING: no year=0 population values found; budget may be empty")
            return

        to_create = []
        for year in range(scenario.start_year, scenario.end_year + 1):
            for v in base_values:
                to_create.append(
                    MetricValue(
                        metric_type_id=v.metric_type_id,
                        org_unit_id=v.org_unit_id,
                        value=v.value,
                        string_value=v.string_value,
                        year=year,
                    )
                )

        MetricValue.objects.bulk_create(to_create, ignore_conflicts=True)
        self.stdout_write(
            f"Extended {len(base_values)} population baseline values to {scenario.end_year - scenario.start_year + 1} scenario years"
        )
