from django.db.models import Prefetch
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from plugins.snt_malaria.api.interventionassignments.serializers import InterventionAssignmentToOrgUnitSerializer
from plugins.snt_malaria.api.interventionMixes.filters import InterventionMixListFilter
from plugins.snt_malaria.api.interventionMixes.serializers import InterventionMixSerializer
from plugins.snt_malaria.api.interventions.serializers import InterventionSerializer
from plugins.snt_malaria.models.intervention import InterventionAssignment, InterventionMix


class InterventionMixViewSet(viewsets.ModelViewSet):
    serializer_class = InterventionMixSerializer
    ordering_fields = ["id", "name"]
    http_method_names = ["get", "patch", "delete", "options"]
    filter_backends = [DjangoFilterBackend]
    filterset_class = InterventionMixListFilter

    def get_queryset(self):
        return (
            InterventionMix.objects.prefetch_related("interventions")
            .filter(account=self.request.user.iaso_profile.account)
            .distinct()
        )

    @action(detail=False, methods=["get"])
    def grouped_by_mix(self, request):
        base_queryset = self.filter_queryset(self.get_queryset())

        queryset = base_queryset.prefetch_related(
            Prefetch("interventionassignment_set", queryset=InterventionAssignment.objects.select_related("org_unit"))
        )
        result = []
        for mix in queryset:
            assignments = InterventionAssignmentToOrgUnitSerializer(
                mix.interventionassignment_set.all(), many=True
            ).data
            interventions_data = InterventionSerializer(mix.interventions.all(), many=True).data
            result.append(
                {
                    "id": mix.id,
                    "name": mix.name,
                    "org_units": assignments,
                    "interventions": interventions_data,
                }
            )
        return Response(result)
