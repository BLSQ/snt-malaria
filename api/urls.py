from rest_framework import routers

from .intervention.views import InterventionViewSet
from .interventionCategory.views import InterventionCategoryViewSet
from .scenarios.views import ScenarioViewSet

router = routers.SimpleRouter()
router.register(
    r"snt_malaria/interventionCategory",
    InterventionCategoryViewSet,
    basename="interventionCategory",
)
router.register(
    r"snt_malaria/intervention",
    InterventionViewSet,
    basename="intervention",
)
router.register(r"snt_malaria/scenarios", ScenarioViewSet, basename="scenario")
