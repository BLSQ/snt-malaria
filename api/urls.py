from rest_framework import routers

from .cost_breakdown_line.views import CostBreakdownLineViewSet
from .intervention_assignments.views import InterventionAssignmentViewSet
from .intervention_categories.views import InterventionCategoryViewSet
from .interventions.views import InterventionViewSet
from .scenarios.views import ScenarioViewSet


router = routers.SimpleRouter()
router.register(r"snt_malaria/intervention_categories", InterventionCategoryViewSet, basename="intervention_categories")
router.register(r"snt_malaria/interventions", InterventionViewSet, basename="interventions")
router.register(
    r"snt_malaria/intervention_assignments",
    InterventionAssignmentViewSet,
    basename="intervention_assignments",
)
router.register(r"snt_malaria/scenarios", ScenarioViewSet, basename="scenarios")

# Cost api
router.register(r"snt_malaria/cost_breakdown_lines", CostBreakdownLineViewSet, basename="cost_breakdown_lines")
