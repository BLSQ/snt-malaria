from plugins.snt_malaria.api.scenarios.views import ScenarioPermission
from plugins.snt_malaria.models import ScenarioYearlyCostAssignment


class ScenarioYearlyCostAssignmentPermission(ScenarioPermission):
    def has_object_permission(self, request, view, obj: ScenarioYearlyCostAssignment):
        # # Override this one as scenario permission check this only for deletion
        if obj.scenario.is_locked:
            return False

        return super().has_object_permission(request, view, obj.scenario, extra_safe_methods=[])
