from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from plugins.snt_malaria.models import ScenarioRule

from .permissions import ScenarioRulePermission
from .serializers import (
    ScenarioRuleCreateSerializer,
    ScenarioRuleListSerializer,
    ScenarioRulePreviewSerializer,
    ScenarioRuleQuerySerializer,
    ScenarioRuleRetrieveSerializer,
    ScenarioRuleUpdateSerializer,
)


class ScenarioRuleViewSet(viewsets.ModelViewSet):
    ordering_fields = ["scenario", "priority"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    permission_classes = [ScenarioRulePermission]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated or not hasattr(user, "iaso_profile"):
            return ScenarioRule.objects.none()
        return (
            ScenarioRule.objects.select_related("scenario")
            .prefetch_related("intervention_properties", "intervention_properties__intervention")
            .filter(scenario__account=user.iaso_profile.account)
        )

    def get_serializer_class(self):
        if self.action == "list":
            return ScenarioRuleQuerySerializer
        if self.action == "retrieve":
            return ScenarioRuleRetrieveSerializer
        if self.action == "create":
            return ScenarioRuleCreateSerializer
        if self.action in ["update", "partial_update"]:
            return ScenarioRuleUpdateSerializer
        if self.action == "preview":
            return ScenarioRulePreviewSerializer
        return None

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        scenario = serializer.validated_data["scenario"]

        scenario_rules = self.get_queryset().filter(scenario=scenario).order_by("priority")
        list_serializer = ScenarioRuleListSerializer(scenario_rules, many=True)

        return Response(list_serializer.data, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        """
        Prepares required data for creating a new ScenarioRule that is not directly known by the serializer
        """
        user = self.request.user
        account = user.iaso_profile.account
        matching_criteria = serializer.validated_data.get("matching_criteria")
        org_units_matched = ScenarioRule.resolve_matched_org_units(account, matching_criteria)

        rule: ScenarioRule = serializer.save(created_by=user, org_units_matched=org_units_matched)
        scenario = rule.scenario
        scenario.refresh_assignments(user)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Overriding both create and perform_create to be able to return another type of serializer from the input one
        """
        create_serializer = self.get_serializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        self.perform_create(create_serializer)

        rule = create_serializer.instance
        result_serializer = ScenarioRuleRetrieveSerializer(rule, context=self.get_serializer_context())
        result_headers = self.get_success_headers(result_serializer.data)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED, headers=result_headers)

    def perform_update(self, serializer):
        """
        Prepares required data for updating an existing ScenarioRule that is not directly known by the serializer
        """
        user = self.request.user
        account = user.iaso_profile.account
        extra_values = {
            "updated_by": user,
        }
        if "matching_criteria" in serializer.validated_data:
            matching_criteria = serializer.validated_data["matching_criteria"]
            extra_values["org_units_matched"] = ScenarioRule.resolve_matched_org_units(account, matching_criteria)

        rule: ScenarioRule = serializer.save(**extra_values)
        scenario = rule.scenario
        scenario.refresh_assignments(user)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """
        Overriding both update and perform_update to be able to return another type of serializer from the input one
        """
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        update_serializer = self.get_serializer(instance, data=request.data, partial=partial)
        update_serializer.is_valid(raise_exception=True)
        self.perform_update(update_serializer)

        rule = update_serializer.instance
        result_serializer = ScenarioRuleRetrieveSerializer(rule, context=self.get_serializer_context())
        result_headers = self.get_success_headers(result_serializer.data)
        return Response(result_serializer.data, status=status.HTTP_200_OK, headers=result_headers)

    def perform_destroy(self, instance):
        scenario = instance.scenario
        super().perform_destroy(instance)
        scenario.refresh_assignments(self.request.user)

    @action(detail=False, methods=["post"])
    def preview(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        account = request.user.iaso_profile.account
        matching_criteria = serializer.validated_data.get("matching_criteria")
        matched = set(ScenarioRule.resolve_matched_org_units(account, matching_criteria))

        excluded = set(serializer.validated_data.get("org_units_excluded", []))
        included = set(serializer.validated_data.get("org_units_included", []))
        result = (matched - excluded) | included
        return Response(list(result), status=status.HTTP_200_OK)
