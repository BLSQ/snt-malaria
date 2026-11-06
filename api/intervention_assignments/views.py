from django.utils.translation import gettext_lazy as _
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from plugins.snt_malaria.api.intervention_assignments.filters import (
    InterventionAssignmentListFilter,
)
from plugins.snt_malaria.api.workspace_scoped import WorkspaceScopedViewSetMixin
from plugins.snt_malaria.models import InterventionAssignment
from plugins.snt_malaria.permissions import SNT_SCENARIO_FULL_WRITE_PERMISSION

from .permissions import InterventionAssignmentsPermission
from .serializers import (
    InterventionAssignmentListSerializer,
)


class InterventionAssignmentViewSet(WorkspaceScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = InterventionAssignment.objects.prefetch_related("intervention", "org_unit").select_related("rule")
    workspace_lookup = "scenario__workspace"
    http_method_names = ["get", "delete"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = InterventionAssignmentListFilter
    permission_classes = [InterventionAssignmentsPermission]

    def get_serializer_class(self):
        return InterventionAssignmentListSerializer

    def destroy(self, request, *args, **kwargs):
        assignment = self.get_object()
        scenario = assignment.scenario
        if scenario.is_locked:
            return Response(
                {"scenario_id": _("The scenario is locked and cannot be modified.")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        assignment.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["delete"])
    def delete_many(self, request):
        ids_param = request.query_params.get("ids", "")
        user = request.user
        if not ids_param:
            return Response({"error": "No ids provided."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            ids = [int(i) for i in ids_param.split(",") if i.strip()]
        except ValueError:
            return Response({"error": "Invalid ids format."}, status=status.HTTP_400_BAD_REQUEST)
        assignments = InterventionAssignment.objects.select_related("scenario").filter(id__in=ids)
        for assignment in assignments:
            scenario = assignment.scenario
            if scenario.is_locked:
                return Response(
                    {"scenario_id": "The scenario is locked and cannot be modified."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if scenario.created_by != user and not user.has_perm(SNT_SCENARIO_FULL_WRITE_PERMISSION.full_name()):
                return Response(
                    {"scenario_id": "You do not have permission to delete assignments from this scenario."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if scenario.workspace_id != self.workspace.id:
                return Response(
                    {"assignment_id": "This assigment was not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        deleted_count, _ = assignments.delete()
        return Response(
            {"message": f"{deleted_count} intervention assignments deleted."},
            status=status.HTTP_204_NO_CONTENT,
        )
