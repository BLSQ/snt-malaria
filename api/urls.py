from rest_framework import routers

from .intervention.views import InterventionViewSet
from .interventionAssignement.views import InterventionAssignmentViewSet
from .interventionCategory.views import InterventionCategoryViewSet
from .scenarios.views import ScenarioViewSet


router = routers.SimpleRouter()
router.register(r"snt_malaria/interventioncategories", InterventionCategoryViewSet, basename="interventioncategories")
router.register(r"snt_malaria/interventions", InterventionViewSet, basename="interventions")
router.register(
    r"snt_malaria/interventionassignments",
    InterventionAssignmentViewSet,
    basename="interventionassignments",
)
router.register(r"snt_malaria/scenarios", ScenarioViewSet, basename="scenarios")
