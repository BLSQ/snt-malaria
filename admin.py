from django.contrib import admin

from .models import (
    Budget,
    BudgetAssumptions,
    BudgetSettings,
    Intervention,
    InterventionAssignment,
    InterventionCategory,
    InterventionCostBreakdownLine,
    Scenario,
    ScenarioRule,
)
from .models.scenario import ScenarioRuleInterventionProperties


@admin.register(InterventionCategory)
class InterventionCategoryAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "short_name",
        "account",
        "created_by",
        "created_at",
        "updated_at",
        "deleted_at",
    )
    search_fields = ("name", "description")
    list_filter = ("account", "created_by")
    ordering = ("name",)


@admin.register(Intervention)
class InterventionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "short_name",
        "intervention_category",
        "created_by",
        "created_at",
        "updated_at",
        "updated_by",
        "deleted_at",
    )
    search_fields = ("name", "description")
    list_filter = (
        "intervention_category__account",
        "created_by",
    )
    ordering = ("name",)


@admin.register(InterventionAssignment)
class InterventionAssignmentAdmin(admin.ModelAdmin):
    raw_id_fields = ("org_unit", "intervention")
    list_display = (
        "scenario",
        "created_by",
        "created_at",
    )
    list_filter = ("scenario", "intervention", "created_by")
    search_fields = ("scenario__name", "org_unit__name")


@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "account",
        "created_by",
        "created_at",
        "updated_at",
        "deleted_at",
    )
    search_fields = ("name", "description")
    list_filter = ("account", "created_by")
    ordering = ("name",)


class ScenarioRuleInterventionPropertiesInline(admin.TabularInline):
    model = ScenarioRuleInterventionProperties
    extra = 3


@admin.register(ScenarioRule)
class ScenarioRuleAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "scenario",
        "priority",
        "created_by",
        "created_at",
        "updated_at",
    )
    search_fields = ("name",)
    list_filter = ("scenario", "created_by")
    ordering = ("scenario", "priority")
    inlines = [ScenarioRuleInterventionPropertiesInline]


@admin.register(InterventionCostBreakdownLine)
class InterventionCostBreakdownLineAdmin(admin.ModelAdmin):
    list_display = ("id", "intervention", "name", "unit_cost", "created_at")
    search_fields = ("intervention",)
    list_filter = ("intervention",)
    ordering = ("id", "name")


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ("id", "scenario", "name", "cost_input", "assumptions", "updated_at")
    search_fields = ("id", "name")
    list_filter = ("scenario",)
    ordering = ("id", "name", "updated_at")


@admin.register(BudgetSettings)
class BudgetSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "account",
        "local_currency",
        "exchange_rate",
        "inflation_rate",
    )
    search_fields = ("id", "local_currency")
    ordering = ("id", "local_currency")


@admin.register(BudgetAssumptions)
class BudgetAssumptionsAdmin(admin.ModelAdmin):
    list_display = ("id", "scenario", "intervention_code")
    search_fields = ("id", "scenario", "intervention_code")
    ordering = ("id",)
