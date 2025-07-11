"""
Views for SNT Malaria plugin admin functionality.
"""

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
        # Get form data
        workspace_slug = request.POST.get("workspace_slug", "").strip()
        dataset_slug = request.POST.get("dataset_slug", "").strip()
        account_id = request.POST.get("account_id", "")

        # Validate form data
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

        # Execute the management command
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

            # Format output for HTML display
            html_output = f"""
            <html>
                <head>
                    <title>OpenHEXA Metrics Import Results</title>
                    <style>
                        body {{
                            font-family: Arial, sans-serif;
                            max-width: 1000px;
                            margin: 20px auto;
                            padding: 20px;
                            background-color: #f5f5f5;
                        }}
                        .results {{
                            background-color: white;
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }}
                        .success {{
                            color: #27ae60;
                            font-weight: bold;
                        }}
                        .command-output {{
                            background-color: #f8f9fa;
                            padding: 15px;
                            border-radius: 4px;
                            border-left: 4px solid #007cba;
                            font-family: monospace;
                            white-space: pre-wrap;
                            margin: 20px 0;
                        }}
                        .back-link {{
                            display: inline-block;
                            margin-top: 20px;
                            color: #007cba;
                            text-decoration: none;
                        }}
                        .back-link:hover {{
                            text-decoration: underline;
                        }}
                    </style>
                </head>
                <body>
                    <div class="results">
                        <h1 class="success">✅ OpenHEXA Metrics Import Completed</h1>
                        <p><strong>Workspace:</strong> {workspace_slug}</p>
                        <p><strong>Dataset:</strong> {dataset_slug}</p>
                        <p><strong>Account ID:</strong> {account_id}</p>

                        <h2>Command Output:</h2>
                        <div class="command-output">{output}</div>

                        <a href="/snt_malaria/import_openhexa_metrics/" class="back-link">← Back to Import Form</a>
                    </div>
                </body>
            </html>
            """

            return HttpResponse(html_output)

        except Exception as e:
            # Handle command execution errors
            error_html = f"""
            <html>
                <head>
                    <title>OpenHEXA Metrics Import Error</title>
                    <style>
                        body {{
                            font-family: Arial, sans-serif;
                            max-width: 800px;
                            margin: 20px auto;
                            padding: 20px;
                            background-color: #f5f5f5;
                        }}
                        .error {{
                            background-color: white;
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }}
                        .error-title {{
                            color: #e74c3c;
                            font-weight: bold;
                        }}
                        .error-details {{
                            background-color: #ffeaa7;
                            padding: 15px;
                            border-radius: 4px;
                            border-left: 4px solid #e74c3c;
                            font-family: monospace;
                            white-space: pre-wrap;
                            margin: 20px 0;
                        }}
                        .back-link {{
                            display: inline-block;
                            margin-top: 20px;
                            color: #007cba;
                            text-decoration: none;
                        }}
                        .back-link:hover {{
                            text-decoration: underline;
                        }}
                    </style>
                </head>
                <body>
                    <div class="error">
                        <h1 class="error-title">❌ OpenHEXA Metrics Import Failed</h1>
                        <p><strong>Workspace:</strong> {workspace_slug}</p>
                        <p><strong>Dataset:</strong> {dataset_slug}</p>
                        <p><strong>Account ID:</strong> {account_id}</p>

                        <h2>Error Details:</h2>
                        <div class="error-details">{str(e)}</div>

                        <a href="/snt_malaria/import_openhexa_metrics/" class="back-link">← Back to Import Form</a>
                    </div>
                </body>
            </html>
            """

            return HttpResponse(error_html, status=500)

    # GET request - display the form
    # Get all accounts to populate the select dropdown
    accounts = Account.objects.all().order_by("name")

    template = loader.get_template("import_openhexa_metrics.html")
    context = {
        "accounts": accounts,
    }
    return HttpResponse(template.render(context, request))
