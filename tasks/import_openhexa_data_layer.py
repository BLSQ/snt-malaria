"""Background task: import a data layer's values from OpenHexa.

The MetricType shell is created synchronously by the API; this task downloads the
source CSV named by the layer's SOURCE_DATA and (re)builds its MetricValue rows.
"""

import logging

from beanstalk_worker import task_decorator
from iaso.models import MetricType, Task
from plugins.snt_malaria.api.openhexa_data_layers.client import (
    CONFIG_FILENAME,
    METADATA_FILENAME,
    download_dataset_file,
    fetch_dataset_jsons,
    resolve_config_dataset,
)
from plugins.snt_malaria.api.openhexa_data_layers.constants import IMPORT_TASK_NAME
from plugins.snt_malaria.api.openhexa_data_layers.importer import import_metric_values
from plugins.snt_malaria.api.openhexa_data_layers.source import resolve_source_file


logger = logging.getLogger(__name__)


@task_decorator(task_name=IMPORT_TASK_NAME)
def import_openhexa_data_layer(metric_type_id: int, task: Task = None):
    task.report_progress_and_stop_if_killed(progress_message="Starting OpenHexa data layer import")

    metric_type = MetricType.objects.select_related("account").get(id=metric_type_id)
    account = metric_type.account
    logger.info(
        "import_openhexa_data_layer: metric type %s (code '%s'), account %s (%s)",
        metric_type_id,
        metric_type.code,
        account.id,
        account.name,
    )

    openhexa_url, openhexa_token, workspace_slug, dataset_slug = resolve_config_dataset(account)
    logger.info("import_openhexa_data_layer: workspace '%s', configuration dataset '%s'", workspace_slug, dataset_slug)

    task.report_progress_and_stop_if_killed(progress_message="Reading the OpenHexa configuration")
    config_files = fetch_dataset_jsons(
        openhexa_url, openhexa_token, workspace_slug, dataset_slug, [METADATA_FILENAME, CONFIG_FILENAME]
    )
    metadata, snt_config = config_files[METADATA_FILENAME], config_files[CONFIG_FILENAME]

    definition = metadata.get(metric_type.code)
    if not isinstance(definition, dict):
        raise ValueError(f"Data layer '{metric_type.code}' is no longer defined in SNT_metadata.json")
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

    count = import_metric_values(metric_type, csv_bytes.decode("utf-8"), source.column, task=task)

    logger.info(
        "import_openhexa_data_layer: wrote %d values for metric type %s ('%s')", count, metric_type_id, metric_type.code
    )
    task.report_success(message=f"Imported {count} values for '{metric_type.name}' ({plan})")
