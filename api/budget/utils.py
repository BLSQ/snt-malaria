import pandas as pd

from rest_framework.exceptions import ValidationError
from snt_malaria_budgeting import InterventionDetailModel

from iaso.models import MetricType, MetricValue
from plugins.snt_malaria.models import BudgetSettings, InterventionCostBreakdownLine


# This is Work in Progress
# For now this creates a dataframe for the population as expected by the budget function.
# It duplicates the total population (MetricType with code="POPULATION") for all columns.
# As well as duplicates all data to fit years 2025 to 2027.
#
# TODO:
# - think about the str() issue for org_unit_id
# - add correct different pop datas from OH
# - add correct years, make this a param to this function
# - think about error handling all the way to the frontend
def build_population_dataframe(account):
    """
    Build a population dataframe from

    Returns a DataFrame with columns:
    - org_unit_id: OrgUnit ID
    - year: Year of the metric
    - pop_total, pop_0_5, pop_0_1, pop_1_2, pop_vaccine_5_36_months, pop_pw, pop_5_10, pop_urbain:
      All populated with the same total population value for now
    """
    try:
        metric_type = MetricType.objects.get(account=account, code="POPULATION")
    except MetricType.DoesNotExist:
        raise ValidationError("MetricType with code 'POPULATION' does not exist for this account")

    # Query all MetricValues for this MetricType
    metric_values = (
        MetricValue.objects.filter(metric_type=metric_type)
        .select_related("org_unit")
        .values("org_unit_id", "year", "value")
    )

    if not metric_values:
        raise ValidationError("No population data found for MetricType 'POPULATION'")

    # Convert to DataFrame
    df = pd.DataFrame(list(metric_values))

    # Duplicate data across years 2025, 2026, 2027
    years = [2025, 2026, 2027]
    dfs_by_year = []

    for year in years:
        df_year = df.copy()
        df_year["year"] = year
        dfs_by_year.append(df_year)

    # Combine all years into a single dataframe
    df = pd.concat(dfs_by_year, ignore_index=True)

    # Duplicate the population value across all population columns
    pop_columns = [
        "pop_total",
        "pop_0_5",
        "pop_0_1",
        "pop_1_2",
        "pop_vaccine_5_36_months",
        "pop_pw",
        "pop_5_10",
        "pop_urbain",
    ]

    for col in pop_columns:
        df[col] = df["value"]

    # Drop the original value column
    df = df.drop(columns=["value"])

    return df


def build_cost_dataframe(account):
    """
    Build a cost dataframe from InterventionCostBreakdownLine, Intervention, and BudgetSettings models.

    Returns a DataFrame with columns matching the cost.csv structure:
    - code_intervention: Intervention code
    - type_intervention: Intervention name
    - cost_class: Cost breakdown line category
    - cost_class_other: (empty)
    - description: Intervention description
    - unit: Unit type
    - local_currency_cost: (empty)
    - exchange_rate: From BudgetSettings
    - usd_cost: Unit cost
    - cost_year_for_analysis: Year
    - original_unit_cost: (empty)
    - original_unit_cost_year: (empty)
    - inflation_factor: From BudgetSettings
    - notes: (empty)
    - source: (empty)
    """
    try:
        budget_settings = BudgetSettings.objects.get(account=account)
    except BudgetSettings.DoesNotExist:
        raise ValidationError("BudgetSettings does not exist for this account")

    # Query all cost breakdown lines with related interventions
    cost_lines = (
        InterventionCostBreakdownLine.objects.filter(intervention__intervention_category__account=account)
        .select_related("intervention", "intervention__intervention_category")
        .values(
            "intervention__code",
            "intervention__name",
            "category",
            "intervention__description",
            "unit_type",
            "unit_cost",
            "year",
        )
    )

    if not cost_lines:
        raise ValidationError("No cost breakdown lines found for this account")

    # Convert to DataFrame
    df = pd.DataFrame(list(cost_lines))

    # Rename columns to match CSV structure
    df = df.rename(
        columns={
            "intervention__code": "code_intervention",
            "intervention__name": "type_intervention",
            "category": "cost_class",
            "intervention__description": "description",
            "unit_type": "unit",
            "unit_cost": "usd_cost",
            "year": "cost_year_for_analysis",
        }
    )

    # Add BudgetSettings fields
    df["exchange_rate"] = budget_settings.exchange_rate
    df["inflation_factor"] = budget_settings.inflation_rate

    # Add empty columns for fields that are not mapped
    df["cost_class_other"] = ""
    df["local_currency_cost"] = ""
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
        {"name": "smc", "type": "SP+AQ", "places": [1, 2, 3]}, # list of org_unit_id
        {"name": "vacc", "type": "R21", "places": [1, 2, 3, 4, 5]},
        {"name": "iptp", "type": "SP", "places": [3, 4, 5]},
    ]
    """
    interventions_dict = {}
    assignments = scenario.intervention_assignments.select_related("intervention", "org_unit").all()

    for assignment in assignments:
        intervention_code = assignment.intervention.code
        intervention_type = assignment.intervention.name
        org_unit_id = assignment.org_unit.id

        # Group by intervention name and type
        if intervention_code not in interventions_dict:
            interventions_dict[intervention_code] = {
                "name": intervention_code,
                "type": intervention_type,
                "places": [],
            }
        interventions_dict[intervention_code]["places"].append(org_unit_id)

    interventions = list(interventions_dict.values())
    print("interventions", interventions)

    return [InterventionDetailModel(**i) for i in interventions]
