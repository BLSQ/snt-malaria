from unittest import mock

from iaso.models import MetricType, MetricValue, OrgUnit, Task
from iaso.models.base import ERRORED, SUCCESS
from plugins.snt_malaria.api.openhexa_data_layers.client import CONFIG_FILENAME, METADATA_FILENAME
from plugins.snt_malaria.tasks.import_openhexa_data_layer import import_openhexa_data_layer
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


TASK_PATH = "plugins.snt_malaria.tasks.import_openhexa_data_layer"


def _fake_fetch_dataset_json(metadata):
    """One patched fetch_dataset_json call serves both config files, keyed by filename."""

    def fetch(_url, _token, _ws, _slug, filename):
        return metadata if filename == METADATA_FILENAME else SNT_CONFIG if filename == CONFIG_FILENAME else {}

    return fetch


METADATA = {
    "INCIDENCE_CRUDE": {
        "SOURCE_DATA": {
            "DATASET": {"NAME": "SNT_DHIS2_INCIDENCE", "VERSION": "latest"},
            "FILENAME": "{COUNTRY_CODE}_incidence.csv",
            "COLUMN": "INCIDENCE_CRUDE",
        },
        "LABEL": {"EN": "Crude incidence (DHIS2)"},
        "TYPE": "Threshold",
        "SCALE": [50, 150, 250, 350, 450, 1000],
    }
}
SNT_CONFIG = {
    "SNT_CONFIG": {"COUNTRY_CODE": "COD"},
    "SNT_DATASET_IDENTIFIERS": {"DHIS2_INCIDENCE": "snt-dhis2-incidence"},
}
SOURCE_CSV = b"ADM2_ID,INCIDENCE_CRUDE\nOU1,12.5\nOU2,3\n"


class ImportOpenHexaDataLayerTaskTestCase(SNTMalariaTestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.source, self.version, self.project = self.create_account_datasource_version_project(
            "source", "Test Account", "project"
        )
        ou_type = self.create_snt_org_unit_type(name="DISTRICT")
        for ref in ("OU1", "OU2"):
            self.create_snt_org_unit(
                org_unit_type=ou_type,
                name=ref,
                version=self.version,
                source_ref=ref,
                validation_status=OrgUnit.VALIDATION_VALID,
            )
        self.user = self.create_user_with_profile(username="worker", account=self.account, permissions=[])
        self.metric_type = MetricType.objects.create(
            account=self.account,
            code="INCIDENCE_CRUDE",
            name="Crude incidence",
            legend_type="threshold",
            origin=MetricType.MetricTypeOrigin.OPENHEXA,
        )
        self.task = Task.objects.create(name="import_openhexa_data_layer", launcher=self.user, account=self.account)
        self.workspace = mock.Mock(config={"snt_configuration_dataset": "snt-configuration"})

    def _run(self):
        with (
            mock.patch(
                f"{TASK_PATH}.get_openhexa_config",
                return_value=("https://oh/graphql/", "token", "ws", self.workspace),
            ),
            mock.patch(f"{TASK_PATH}.fetch_dataset_json", side_effect=_fake_fetch_dataset_json(METADATA)),
            mock.patch(f"{TASK_PATH}.download_dataset_file", return_value=SOURCE_CSV) as download,
        ):
            import_openhexa_data_layer(metric_type_id=self.metric_type.id, task=self.task, _immediate=True)
        return download

    def test_downloads_the_resolved_source_file_and_writes_values(self):
        download = self._run()

        download.assert_called_once()
        _url, _token, workspace_slug, dataset_slug, filename = download.call_args[0]
        self.assertEqual((workspace_slug, dataset_slug, filename), ("ws", "snt-dhis2-incidence", "COD_incidence.csv"))

        self.assertEqual(MetricValue.objects.filter(metric_type=self.metric_type).count(), 2)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, SUCCESS)

    def test_fails_when_layer_no_longer_defined(self):
        with (
            mock.patch(
                f"{TASK_PATH}.get_openhexa_config",
                return_value=("https://oh/graphql/", "token", "ws", self.workspace),
            ),
            mock.patch(f"{TASK_PATH}.fetch_dataset_json", side_effect=_fake_fetch_dataset_json({})),
        ):
            import_openhexa_data_layer(metric_type_id=self.metric_type.id, task=self.task, _immediate=True)

        self.task.refresh_from_db()
        self.assertEqual(self.task.status, ERRORED)
