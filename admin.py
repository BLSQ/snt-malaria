from django.contrib import admin

from .models import Intervention, InterventionAssignment, InterventionCategory, Scenario


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
        "cost_per_unit",
        "created_by",
        "created_at",
        "updated_at",
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
        "updated_at",
        "deleted_at",
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
