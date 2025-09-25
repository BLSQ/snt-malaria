"""
URL patterns for SNT Malaria plugin admin functionality.
"""

from django.urls import path

from .views import import_openhexa_metrics


urlpatterns = [
    # Admin tools
    path(
        "import_openhexa_metrics/",
        import_openhexa_metrics,
        name="import_openhexa_metrics",
    ),
]
