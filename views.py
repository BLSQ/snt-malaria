import io

from django.contrib.admin.views.decorators import staff_member_required
from django.core.management import call_command
from django.http import HttpResponse
from django.template import loader

from iaso.models import Account


@staff_member_required
def import_openhexa_metrics(request):
    """
    Admin-only view to import OpenHEXA metrics data via web interface.

    Provides a form to execute the import_openhexa_metrics management command
    with workspace_slug, dataset_slug, and account_id parameters.
    """
    if request.method == "POST":
        workspace_slug = request.POST.get("workspace_slug", "").strip()
        dataset_slug = request.POST.get("dataset_slug", "").strip()
        account_id = request.POST.get("account_id", "")

        if not workspace_slug:
            return HttpResponse("Error: workspace_slug is required", status=400)
        if not dataset_slug:
            return HttpResponse("Error: dataset_slug is required", status=400)
        if not account_id:
            return HttpResponse("Error: account_id is required", status=400)

        try:
            account_id = int(account_id)
        except ValueError:
            return HttpResponse("Error: account_id must be a valid integer", status=400)

        try:
            out = io.StringIO()
            call_command(
                "import_openhexa_metrics",
                workspace_slug=workspace_slug,
                dataset_slug=dataset_slug,
                account_id=account_id,
                stdout=out,
                stderr=out,
            )
            output = out.getvalue()

            # Render success template
            template = loader.get_template("import_openhexa_metrics_success.html")
            context = {
                "workspace_slug": workspace_slug,
                "dataset_slug": dataset_slug,
                "account_id": account_id,
                "output": output,
            }
            return HttpResponse(template.render(context, request))

        except Exception as e:
            template = loader.get_template("import_openhexa_metrics_error.html")
            context = {
                "workspace_slug": workspace_slug,
                "dataset_slug": dataset_slug,
                "account_id": account_id,
                "error_message": str(e),
            }
            return HttpResponse(template.render(context, request), status=500)

    # GET request - display the form
    # Get all accounts to populate the select dropdown
    accounts = Account.objects.all().order_by("name")

    template = loader.get_template("import_openhexa_metrics.html")

    return HttpResponse(template.render({"accounts": accounts}, request))
