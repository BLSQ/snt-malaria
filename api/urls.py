from rest_framework import routers

from plugins.snt_malaria.api.interventioncostcategories.views import InterventionCostCategoryViewSet

from .interventionassignments.views import InterventionAssignmentViewSet
from .interventioncategories.views import InterventionCategoryViewSet
from .interventions.views import InterventionViewSet
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
router.register(
    r"snt_malaria/interventioncostcategories", InterventionCostCategoryViewSet, basename="interventioncostcategories"
)
