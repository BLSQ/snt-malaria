"""
Create a demo scenario with intervention assignments for Burkina Faso
"""

from datetime import date

from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS, BudgetCalculator

from iaso.models import OrgUnitType, User
from iaso.models.data_store import JsonDataStore
from iaso.models.metric import MetricType
from plugins.snt_malaria.api.budget.utils import (
    build_cost_dataframe,
    build_interventions_input,
    build_population_dataframe,
)
from plugins.snt_malaria.models.budget import Budget
from plugins.snt_malaria.models.intervention import Intervention
from plugins.snt_malaria.models.scenario import Scenario, ScenarioRule, ScenarioRuleInterventionProperties


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

        scenario_1 = self._create_scenario_(
            "NSP 1", created_by, interventions, seasonality_precipitation_metric_type, pf_rate_metric_type, rate=60
        )
        scenario_2 = self._create_scenario_(
            "NSP 2", created_by, interventions, seasonality_precipitation_metric_type, pf_rate_metric_type, rate=80
        )

        # Create a budget for the scenario
        # self.stdout_write("\nCreating budget for scenario...")
        # budget = self._create_budget_for_scenario(scenario, created_by)
        # self.stdout_write(f"Created budget: {budget.name}")

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

    def _create_budget_for_scenario(self, scenario, created_by):
        """
        Create a budget for the given scenario using the budget calculator.
        """
        start_year = scenario.start_year
        end_year = scenario.end_year

        # Build cost and population dataframes and format the intervention plan
        cost_df = build_cost_dataframe(self.account, start_year, end_year)
        population_df = build_population_dataframe(self.account, start_year, end_year)
        interventions_input = build_interventions_input(scenario)

        # Build a quick lookup map ((code, type) -> id) for fast id retrieval
        interventions = Intervention.objects.filter(intervention_category__account=self.account)
        interventions_map = {(iv.code, iv.name): iv.id for iv in interventions}

        # Use default cost assumptions
        settings = DEFAULT_COST_ASSUMPTIONS

        budgets = []
        budget_calculator = BudgetCalculator(
            interventions_input=interventions_input,
            settings=settings,
            cost_df=cost_df,
            population_df=population_df,
            local_currency="USD",
            budget_currency="USD",
            spatial_planning_unit="org_unit_id",
        )

        # Calculate budget for each year
        for year in range(start_year, end_year + 1):
            interventions_costs = budget_calculator.get_interventions_costs(year)
            places_costs = budget_calculator.get_places_costs(year)

            # Adjust cost breakdown category field name
            for intervention in interventions_costs:
                for cost_breakdown in intervention["cost_breakdown"]:
                    cost_breakdown["category"] = cost_breakdown.pop("cost_class", None)

            # Adjust place costs field names and attach intervention IDs
            for place_cost in places_costs:
                place_cost["org_unit_id"] = place_cost.pop("place")

                for place_cost_intervention in place_cost.get("interventions", []):
                    code = place_cost_intervention["code"]
                    type_ = place_cost_intervention["type"]
                    intervention_id = interventions_map.get((code, type_))
                    place_cost_intervention["id"] = intervention_id

            budgets.append({"year": year, "interventions": interventions_costs, "org_units_costs": places_costs})

        # Create the budget object
        budget = Budget.objects.create(
            scenario=scenario,
            name=f"Budget for {scenario.name}",
            cost_input={},
            assumptions=settings,
            results=budgets,
            population_input={},
            created_by=created_by,
            updated_by=created_by,
        )

        return budget

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

        self.stdout_write("Create intervention_properties for three scenario rules...")

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=all_orgunits_rules,
            intervention=interventions.get(code="cm_public"),
            coverage=1,
        )

        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=all_orgunits_rules,
            intervention=interventions.filter(code="iptp").first(),
            coverage=1,
        )
        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=smc_rule,
            intervention=interventions.get(code="smc", name="SMC (SP+AQ)"),
            coverage=1,
        )
        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=itn_dual_ai_rule,
            intervention=interventions.get(code="itn_routine", name="Dual AI"),
            coverage=1,
        )
        ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=itn_pbo_rule,
            intervention=interventions.get(code="itn_routine", name="PBO"),
            coverage=1,
        )

        self.stdout_write("Assign interventions to scenario...")
        scenario.refresh_assignments(user=user)
        assignment_count = scenario.intervention_assignments.count()
        self.stdout_write(f"Assigned {assignment_count} interventions to scenario")
