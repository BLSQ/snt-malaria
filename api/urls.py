from rest_framework import routers

from .interventionassignments.views import InterventionAssignmentViewSet
from .interventioncategories.views import InterventionCategoryViewSet
from .interventioncostcategories.views import InterventionCostCategoryViewSet
from .interventioncosts.views import InterventionCostsViewSet
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

# Cost api
router.register(r"snt_malaria/interventioncosts", InterventionCostsViewSet, basename="interventioncosts")
router.register(
    r"snt_malaria/interventioncostcategories", InterventionCostCategoryViewSet, basename="interventioncostcategories"
)
