from django.conf import settings
from django.http import Http404
from django.shortcuts import redirect

from hat.dashboard import views as dashboard_views


def public_account_setup_spa(request):
    """Serve the anonymous account-setup SPA only when explicitly enabled.

    Authenticated users are sent to the dashboard so the creation form is never
    shown to logged-in users (e.g. bookmarks to the public URL after signup).
    """
    if not getattr(settings, "ENABLE_PUBLIC_ACCOUNT_SETUP", False):
        raise Http404()
    if request.user.is_authenticated:
        return redirect("/dashboard/")
    return dashboard_views.public_iaso(request)
