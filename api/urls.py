from rest_framework import routers
from plugins.snt_malaria.api.intervention.views import InterventionViewSet
from plugins.snt_malaria.api.interventionsFamilly.views import (
    InterventionsFamillyViewSet,
)

router = routers.SimpleRouter()
router.register(
    r"snt_malaria/interventionsFamilly",
    InterventionsFamillyViewSet,
    basename="interventionsFamilly",
)
router.register(
    r"snt_malaria/intervention",
    InterventionViewSet,
    basename="intervention",
)
