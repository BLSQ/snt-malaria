from django.contrib import admin

from .models import (
    Budget,
    BudgetSettings,
    Intervention,
    InterventionAssignment,
    InterventionCategory,
    InterventionCostBreakdownLine,
    Scenario,
)


@admin.register(InterventionCategory)
class InterventionCategoryAdmin(admin.ModelAdmin):
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


@admin.register(Intervention)
class InterventionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "intervention_category",
        "created_by",
        "created_at",
        "updated_at",
        "updated_by",
        "deleted_at",
    )
    search_fields = ("name", "description")
    list_filter = ("intervention_category", "created_by")
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


@admin.register(InterventionCostBreakdownLine)
class InterventionCostBreakdownLineAdmin(admin.ModelAdmin):
    list_display = ("name", "id", "unit_cost", "intervention", "created_by", "created_at")
    search_fields = ("name", "id")
    list_filter = ("name", "id")
    ordering = ("id", "name")


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ("id", "scenario", "name", "cost_input", "assumptions", "updated_at")
    search_fields = ("id", "name")
    list_filter = ("scenario",)
    ordering = ("id", "name", "updated_at")


@admin.register(BudgetSettings)
class BudgetSettingsAdmin(admin.ModelAdmin):
    list_display = ("id", "account", "local_currency", "exchange_rate", "inflation_rate")
    search_fields = ("id", "local_currency")
    ordering = ("id", "local_currency")
