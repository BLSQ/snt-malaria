import json

from django import forms
from django.contrib import admin, messages
from django.contrib.admin import helpers
from django.db import models
from django.shortcuts import redirect, render
from django.urls import path, reverse
from django.utils.html import format_html

from iaso.admin import IasoJSONEditorWidget
from iaso.models import Account
from plugins.snt_malaria.api.account_settings.serializers import AccountSettings
from plugins.snt_malaria.management.commands.load_impact_org_unit_mappings import (
    HELP_TEXT as IMPACT_MAPPING_HELP_TEXT,
    MappingLoadError,
    load_impact_org_unit_mappings,
)

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
        ("Caching", {"fields": ("cache_ttl_seconds",)}),
    )


MAPPING_FILE_HELP = format_html(
    "<p>JSON array of {{name, reference?, children?}} nodes.</p>"
    "<details><summary>Expected file format</summary>"
    '<pre style="white-space: pre-wrap;">{}</pre></details>',
    IMPACT_MAPPING_HELP_TEXT,
)


class LoadImpactOrgUnitMappingsForm(forms.Form):
    account = forms.ModelChoiceField(
        queryset=Account.objects.order_by("name"),
        help_text="Account whose default version's org units will be mapped.",
    )
    mapping_file = forms.FileField(
        label="Mapping file",
        help_text=MAPPING_FILE_HELP,
    )
    overwrite = forms.BooleanField(
        required=False,
        help_text="Overwrite existing mappings. Without this flag only unmapped org units are processed.",
    )


@admin.register(ImpactOrgUnitMapping)
class ImpactOrgUnitMappingAdmin(admin.ModelAdmin):
    list_display = ("id", "org_unit", "reference", "get_account")
    list_editable = ("reference",)
    autocomplete_fields = ("org_unit",)
    search_fields = ("org_unit__name", "reference")
    list_filter = ("org_unit__version__data_source__projects__account",)
    ordering = ("org_unit__name",)
    change_list_template = "admin/snt_malaria/impactorgunitmapping/change_list.html"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("org_unit__version__data_source")
            .prefetch_related("org_unit__version__data_source__projects__account")
        )

    @admin.display(description="Account")
    def get_account(self, obj):
        accounts = {project.account.name for project in obj.org_unit.version.data_source.projects.all()}
        return ", ".join(sorted(accounts)) if accounts else "-"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "load-from-file/",
                self.admin_site.admin_view(self.load_from_file_view),
                name="snt_malaria_impactorgunitmapping_load_from_file",
            ),
        ]
        return custom_urls + urls

    def load_from_file_view(self, request):
        changelist_url = reverse("admin:snt_malaria_impactorgunitmapping_changelist")
        if request.method == "POST":
            form = LoadImpactOrgUnitMappingsForm(request.POST, request.FILES)
            if form.is_valid():
                uploaded = form.cleaned_data["mapping_file"]
                try:
                    mapping_nodes = json.load(uploaded)
                except json.JSONDecodeError as e:
                    form.add_error("mapping_file", f"Invalid JSON: {e}")
                else:
                    try:
                        counts = load_impact_org_unit_mappings(
                            account=form.cleaned_data["account"],
                            mapping_nodes=mapping_nodes,
                            overwrite=form.cleaned_data["overwrite"],
                        )
                    except MappingLoadError as e:
                        form.add_error(None, str(e))
                    else:
                        messages.success(
                            request,
                            (
                                f"Account '{form.cleaned_data['account'].name}': "
                                f"created {counts['created']}, updated {counts['updated']}, "
                                f"skipped {counts['skipped']} mapping(s)."
                            ),
                        )
                        return redirect(changelist_url)
        else:
            form = LoadImpactOrgUnitMappingsForm()

        fieldsets = [(None, {"fields": list(form.fields)})]
        adminform = helpers.AdminForm(form, fieldsets, prepopulated_fields={}, model_admin=self)

        context = {
            **self.admin_site.each_context(request),
            "title": "Load impact org unit mappings from file",
            "adminform": adminform,
            "errors": helpers.AdminErrorList(form, []),
            "media": self.media + form.media,
            "opts": self.model._meta,
            "has_file_field": True,
            "add": True,
            "change": False,
            "is_popup": False,
            "save_as": False,
            "show_save": True,
            "show_save_and_add_another": False,
            "show_save_and_continue": False,
            "show_delete": False,
            "has_add_permission": True,
            "has_change_permission": True,
            "has_delete_permission": False,
            "has_view_permission": True,
            "has_editable_inline_admin_formsets": False,
        }
        return render(request, "admin/change_form.html", context)


@admin.register(AccountSettings)
class AccountSettingsAdmin(admin.ModelAdmin):
    list_display = ("id", "account", "focus_org_unit_type_id", "intervention_org_unit_type_id")
    search_fields = ("account__name",)
    ordering = ("account__name",)
