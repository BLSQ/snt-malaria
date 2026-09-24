"""Background task: import a data layer's values from OpenHexa.

The MetricType shell is created synchronously by the API; this task downloads the
source CSV named by the layer's SOURCE_DATA and (re)builds its MetricValue rows.
"""

import logging

from django.utils.translation import gettext_lazy as _

from beanstalk_worker import task_decorator
from iaso.models import KilledException, MetricType, Task
from plugins.snt_malaria.api.openhexa_data_layers.constants import IMPORT_TASK_NAME
from plugins.snt_malaria.api.openhexa_data_layers.source import resolve_source_file
from plugins.snt_malaria.providers.openhexa_data_layers import (
    CONFIG_FILENAME,
    METADATA_FILENAME,
    download_dataset_file,
    fetch_dataset_jsons,
    resolve_config_dataset,
)
from plugins.snt_malaria.services.openhexa_data_layers import import_metric_values


logger = logging.getLogger(__name__)


@task_decorator(task_name=IMPORT_TASK_NAME)
def import_openhexa_data_layer(metric_type_id: int, task: Task = None):
    metric_type = MetricType.objects.select_related("account").get(id=metric_type_id)
    account = metric_type.account
    is_first_import = not metric_type.is_complete
    logger.info(
        "import_openhexa_data_layer: metric type %s (code '%s'), account %s (%s)",
        metric_type_id,
        metric_type.code,
        account.id,
        account.name,
    )

    try:
        task.report_progress_and_stop_if_killed(progress_message="Starting OpenHexa data layer import")

        openhexa_url, openhexa_token, workspace_slug, dataset_slug = resolve_config_dataset(account)
        logger.info(
            "import_openhexa_data_layer: workspace '%s', configuration dataset '%s'", workspace_slug, dataset_slug
        )

        task.report_progress_and_stop_if_killed(progress_message="Reading the OpenHexa configuration")
        config_files = fetch_dataset_jsons(
            openhexa_url, openhexa_token, workspace_slug, dataset_slug, [METADATA_FILENAME, CONFIG_FILENAME]
        )
        metadata, snt_config = config_files[METADATA_FILENAME], config_files[CONFIG_FILENAME]

        definition = metadata.get(metric_type.code)
        if not isinstance(definition, dict):
            raise ValueError(
                _("Data layer '{code}' is no longer defined in SNT_metadata.json").format(code=metric_type.code)
            )
        logger.info(
            "import_openhexa_data_layer: '%s' SOURCE_DATA=%s, SNT_config COUNTRY_CODE=%s, dataset identifiers=%s",
            metric_type.code,
            definition.get("SOURCE_DATA"),
            (snt_config.get("SNT_CONFIG") or {}).get("COUNTRY_CODE"),
            sorted((snt_config.get("SNT_DATASET_IDENTIFIERS") or {}).keys()),
        )

        source = resolve_source_file(definition, snt_config)
        plan = f"column '{source.column}' from file '{source.filename}' in OpenHexa dataset '{source.dataset_slug}'"
        logger.info("import_openhexa_data_layer: will load %s", plan)
        task.report_progress_and_stop_if_killed(progress_message=f"Loading {plan}")

        csv_bytes = download_dataset_file(
            openhexa_url, openhexa_token, workspace_slug, source.dataset_slug, source.filename
        )

        # Marks the metric type complete as soon as it has values (see
        # `import_metric_values`), so the layer is usable even if the wizard tab closes
        # before the user reaches the wizard's explicit POST .../complete/.
        count = import_metric_values(metric_type, csv_bytes.decode("utf-8"), source.column, task=task)
    except KilledException:
        if is_first_import:
            # Nothing usable existed for this layer before this run started, so cancelling it
            # shouldn't leave behind an empty, permanently-incomplete MetricType shell.
            logger.warning(
                "import_openhexa_data_layer: killed before metric type %s ('%s') had any values, deleting it",
                metric_type_id,
                metric_type.code,
            )
            metric_type.delete()
        raise

    logger.info(
        "import_openhexa_data_layer: wrote %d values for metric type %s ('%s')", count, metric_type_id, metric_type.code
    )
    task.report_success(message=f"Imported {count} values for '{metric_type.name}' ({plan})")
