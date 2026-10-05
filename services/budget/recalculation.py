from plugins.snt_malaria.models.intervention import InterventionAssignment
from plugins.snt_malaria.services.budget.budget_calculation import BudgetCalculationService


def recalculate_budgets_for_intervention(intervention, user):
    """Refresh the budget of every scenario assigning this intervention, since its cost lines drive the costs."""
    scenario_ids = (
        InterventionAssignment.objects.filter(intervention=intervention)
        .values_list("scenario_id", flat=True)
        .distinct()
    )
    scenarios = intervention.intervention_category.account.scenario_set.filter(id__in=scenario_ids)
    for scenario in scenarios:
        BudgetCalculationService(scenario).calculate_and_save_all_years(user)
