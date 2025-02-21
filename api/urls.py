from rest_framework import routers
from plugins.snt_malaria.api.intervention.views import InterventionViewSet
from plugins.snt_malaria.api.interventionCategory.views import (
    InterventionCategoryViewSet,
)

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
