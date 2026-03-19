from django import forms
from django.contrib import admin
from django.db import models

from iaso.admin import IasoJSONEditorWidget
from plugins.snt_malaria.api.account_settings.serializers import AccountSettings

from .models import (
    Budget,
    BudgetAssumptions,
    BudgetSettings,
    ImpactOrgUnitMapping,
    ImpactProviderConfig,
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
        "code",
        "impact_ref",
        "created_by",
        "created_at",
        "updated_at",
        "updated_by",
        "deleted_at",
    )
    list_editable = ("impact_ref",)
    search_fields = ("name", "description", "code", "impact_ref")
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


class ImpactProviderConfigForm(forms.ModelForm):
    secret = forms.CharField(
        widget=forms.PasswordInput(attrs={"autocomplete": "off"}, render_value=True),
        required=False,
        help_text=ImpactProviderConfig._meta.get_field("secret").help_text,
    )

    class Meta:
        model = ImpactProviderConfig
        fields = "__all__"


@admin.register(ImpactProviderConfig)
class ImpactProviderConfigAdmin(admin.ModelAdmin):
    form = ImpactProviderConfigForm
    formfield_overrides = {models.JSONField: {"widget": IasoJSONEditorWidget}}
    list_display = ("id", "account", "provider_key")
    list_filter = ("provider_key",)
    search_fields = ("account__name",)
    ordering = ("account__name",)
    fieldsets = (
        (None, {"fields": ("account", "provider_key")}),
        ("Provider configuration", {"fields": ("config", "secret")}),
    )


@admin.register(ImpactOrgUnitMapping)
class ImpactOrgUnitMappingAdmin(admin.ModelAdmin):
    list_display = ("id", "org_unit", "reference")
    list_editable = ("reference",)
    raw_id_fields = ("org_unit",)
    search_fields = ("org_unit__name", "reference")
    ordering = ("org_unit__name",)


@admin.register(AccountSettings)
class AccountSettingsAdmin(admin.ModelAdmin):
    list_display = ("id", "account", "intervention_org_unit_type_id")
    search_fields = ("account__name",)
    ordering = ("account__name",)
