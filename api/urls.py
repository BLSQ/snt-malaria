from rest_framework import routers
from plugins.snt_malaria.api.interventions.views import InterventionViewSet

router = routers.SimpleRouter()
router.register(
    r"snt_malaria/interventions", InterventionViewSet, basename="interventions"
)
