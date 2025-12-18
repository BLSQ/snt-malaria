import pandas as pd

from django.utils import translation
from rest_framework.exceptions import ValidationError
from snt_malaria_budgeting import DEFAULT_COST_ASSUMPTIONS, InterventionDetailModel

from iaso.models import MetricType, MetricValue
from plugins.snt_malaria.models import BudgetSettings, InterventionCostBreakdownLine
from plugins.snt_malaria.models.budget_assumptions import BudgetAssumptions


# This is Work in Progress
# For now this creates a dataframe for the population as expected by the budget function.
# It duplicates all data to fit years in the scenario range.
#
# TODO:
# - think about the str() issue for org_unit_id
# - think about error handling all the way to the frontend
def build_population_dataframe(account, start_year, end_year):
    """
    Build a population dataframe from MetricTypes with population data.

    Returns a DataFrame with columns:
    - org_unit_id: OrgUnit ID
    - year: Year of the metric
    - pop_total, pop_0_5, pop_0_1, pop_1_2, pop_vaccine_5_36_months, pop_pw, pop_5_10, pop_urbain:
      Populated from their respective MetricTypes
    """
    # Mapping from MetricType codes to DataFrame column names
    metric_code_to_column = {
        "POPULATION": "pop_total",
        "POP_UNDER_5": "pop_0_5",
        "POP_0_1_Y": "pop_0_1",
        "POP_1_2_Y": "pop_1_2",
        "POP_5_36_M": "pop_vaccine_5_36_months",
        "POP_PREGNANT_WOMAN": "pop_pw",
        "POP_5_10_Y": "pop_5_10",
        "POP_URBAN": "pop_urbain",
    }

    pop_columns = list(metric_code_to_column.values())

    # Fetch all relevant MetricTypes for this account
    metric_types = MetricType.objects.filter(account=account, code__in=metric_code_to_column.keys())

    if not metric_types.exists():
        raise ValidationError("No population MetricTypes found for this account")

    # Check for required POPULATION metric type
    metric_type_codes = set(metric_types.values_list("code", flat=True))
    if "POPULATION" not in metric_type_codes:
        raise ValidationError("MetricType with code 'POPULATION' does not exist for this account")

    # Fetch all MetricValues for these MetricTypes
    metric_values = (
        MetricValue.objects.filter(metric_type__in=metric_types)
        .select_related("metric_type")
        .values("org_unit_id", "year", "value", "metric_type__code")
    )

    if not metric_values:
        raise ValidationError("No population data found")

    # Convert to DataFrame
    df = pd.DataFrame(list(metric_values))

    # Pivot the data so each metric type becomes a column
    df_pivoted = df.pivot_table(
        index=["org_unit_id"],
        columns="metric_type__code",
        values="value",
        aggfunc="first",
    ).reset_index()

    # Rename columns from metric codes to expected column names
    df_pivoted = df_pivoted.rename(columns=metric_code_to_column)

    # Add potential missing columns with 0 as value
    for col in pop_columns:
        if col not in df_pivoted.columns:
            df_pivoted[col] = 0

    # Ensure all expected population columns exist and set missing values to 0
    for col in pop_columns:
        if col not in df_pivoted.columns:
            df_pivoted[col] = 0
    # Fill any remaining NaNs in population columns with 0
    df_pivoted[pop_columns] = df_pivoted[pop_columns].fillna(0)
    # Duplicate data across scenario years
    dfs_by_year = []
    for year in [year for year in range(start_year, end_year + 1)]:
        df_year = df_pivoted.copy()
        df_year["year"] = year
        dfs_by_year.append(df_year)
    df_final = pd.concat(dfs_by_year, ignore_index=True)

    # Ensure column order is consistent
    final_columns = ["org_unit_id", "year"] + pop_columns
    df_final = df_final[final_columns]

    return df_final


def build_cost_dataframe(account, start_year, end_year):
    """
    Build a cost dataframe from InterventionCostBreakdownLine, Intervention, and BudgetSettings models.
    """
    try:
        budget_settings = BudgetSettings.objects.get(account=account)
    except BudgetSettings.DoesNotExist:
        raise ValidationError("BudgetSettings does not exist for this account")

    # Query all cost breakdown lines with related interventions
    cost_lines = InterventionCostBreakdownLine.objects.filter(
        intervention__intervention_category__account=account
    ).select_related("intervention", "intervention__intervention_category")

    if not cost_lines:
        raise ValidationError("No cost breakdown lines found for this account")

    # Convert to list of dicts with display values for choice fields
    cost_lines_data = []
    for line in cost_lines:
        # Force english here, so our text choices still match budgeting tool types
        with translation.override("en"):
            cost_lines_data.append(
                {
                    "code_intervention": line.intervention.code,
                    "type_intervention": line.intervention.short_name,
                    "cost_class": line.get_category_display(),
                    "description": line.intervention.description,
                    "unit": line.get_unit_type_display(),
                    # TODO: Change budget package to support decimals
                    "usd_cost": float(line.unit_cost),
                    # "cost_year_for_analysis": line.year, # This is set later once we copy per year
                }
            )

    # Convert to DataFrame
    df = pd.DataFrame(cost_lines_data)

    # Duplicate data across scenario years
    dfs_by_year = []
    for year in [year for year in range(start_year, end_year + 1)]:
        df_year = df.copy()
        df_year["cost_year_for_analysis"] = year
        dfs_by_year.append(df_year)
    df = pd.concat(dfs_by_year, ignore_index=True)

    # BudgetSettings fields
    # NOTE: not supported yet by budget script
    df["exchange_rate"] = budget_settings.exchange_rate
    df["inflation_factor"] = budget_settings.inflation_rate

    # Add empty columns for fields that are not mapped
    df["cost_class_other"] = ""
    # TODO: Hardcoded for now
    df["local_currency_cost"] = 1
    df["original_unit_cost"] = ""
    df["original_unit_cost_year"] = ""
    df["notes"] = ""
    df["source"] = ""

    # Reorder columns to match CSV structure
    column_order = [
        "code_intervention",
        "type_intervention",
        "cost_class",
        "cost_class_other",
        "description",
        "unit",
        "local_currency_cost",
        "exchange_rate",
        "usd_cost",
        "cost_year_for_analysis",
        "original_unit_cost",
        "original_unit_cost_year",
        "inflation_factor",
        "notes",
        "source",
    ]

    df = df[column_order]

    return df


def build_interventions_input(scenario):
    """
    Format the interventions to fit the requirement of the budgeting library.
    e.g.
    interventions = [
        {"code": "smc", "type": "SP+AQ", "places": [1, 2, 3]}, # list of org_unit_id
        {"code": "vacc", "type": "R21", "places": [1, 2, 3, 4, 5]},
        {"code": "iptp", "type": "SP", "places": [3, 4, 5]},
    ]
    """
    interventions_dict = {}
    assignments = scenario.intervention_assignments.select_related("intervention", "org_unit").all()

    for assignment in assignments:
        intervention_code = assignment.intervention.code
        intervention_type = assignment.intervention.short_name
        intervention_id = assignment.intervention.id
        org_unit_id = assignment.org_unit.id

        # Group by intervention name and type
        intervention_key = f"{intervention_code}_{intervention_type}"
        if intervention_key not in interventions_dict:
            interventions_dict[intervention_key] = {
                "code": intervention_code,
                "type": intervention_type,
                "id": intervention_id,
                "places": [],
            }

        interventions_dict[intervention_key]["places"].append(org_unit_id)

    interventions = list(interventions_dict.values())

    return [InterventionDetailModel(**i) for i in interventions]


def build_budget_assumptions(scenario):
    """
    Build a map of budget assumptions for quick lookup by intervention code.
    """
    assumptions = BudgetAssumptions.objects.filter(scenario=scenario)
    cost_assumptions = DEFAULT_COST_ASSUMPTIONS.copy()
    for assumption in assumptions:
        # Handle iptp_anc special case
        for key, value in (
            (get_assumption_key(assumption.intervention_code, key), value)
            for key, value in assumption.__dict__.items()
            if key != "id" and key != "scenario" and key != "intervention_code"
        ):
            if key in cost_assumptions:
                # Convert Decimal to float if necessary
                if hasattr(value, "is_finite"):
                    cost_assumptions[key] = float(value)
                else:
                    cost_assumptions[key] = value

    return cost_assumptions


def get_assumption_key(intervention_code, field):
    """
    Get the assumption key for a given intervention code and field.
    Handles special cases like iptp_anc.
    """
    if intervention_code == "iptp" and field == "coverage":
        return f"{intervention_code}_anc_{field}"
    return f"{intervention_code}_{field}"
