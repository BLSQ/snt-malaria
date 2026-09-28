from unittest import mock

from iaso.models import MetricType, MetricValue, OrgUnit, Task
from iaso.models.base import ERRORED, KILLED, SUCCESS
from plugins.snt_malaria.providers.openhexa_data_layers import CONFIG_FILENAME, METADATA_FILENAME
from plugins.snt_malaria.tasks.import_openhexa_data_layer import import_openhexa_data_layer
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


TASK_PATH = "plugins.snt_malaria.tasks.import_openhexa_data_layer"


def _fake_fetch_dataset_jsons(metadata):
    """Stand-in for fetch_dataset_jsons: returns the requested files keyed by filename."""

    def fetch(_url, _token, _ws, _slug, filenames):
        available = {METADATA_FILENAME: metadata, CONFIG_FILENAME: SNT_CONFIG}
        return {name: available.get(name, {}) for name in filenames}

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
            is_complete=False,
        )
        self.task = Task.objects.create(name="import_openhexa_data_layer", launcher=self.user, account=self.account)

    def _run(self, metadata=METADATA):
        with (
            mock.patch(
                f"{TASK_PATH}.resolve_config_dataset",
                return_value=("https://oh/graphql/", "token", "ws", "snt-configuration"),
            ),
            mock.patch(f"{TASK_PATH}.fetch_dataset_jsons", side_effect=_fake_fetch_dataset_jsons(metadata)),
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

    def test_successful_import_marks_an_incomplete_metric_type_as_complete(self):
        """A first import flips `is_complete` itself, instead of relying on the wizard's
        later PATCH to the metrics API - so a shell isn't stuck incomplete forever if the
        tab closes before that PATCH happens."""
        self._run()

        self.metric_type.refresh_from_db()
        self.assertTrue(self.metric_type.is_complete)

    def test_fails_when_layer_no_longer_defined(self):
        self._run(metadata={})

        self.task.refresh_from_db()
        self.assertEqual(self.task.status, ERRORED)

    def test_cancelling_first_import_deletes_the_metric_type_shell(self):
        self.task.should_be_killed = True
        self.task.save()

        self._run()

        self.task.refresh_from_db()
        self.assertEqual(self.task.status, KILLED)
        self.assertFalse(MetricType.objects.filter(id=self.metric_type.id).exists())
        self.assertFalse(MetricValue.objects.filter(metric_type_id=self.metric_type.id).exists())

    def test_cancelling_still_deletes_an_explicitly_completed_but_empty_shell(self):
        """`is_complete=True` alone doesn't mean this run has written anything - e.g. the
        wizard's explicit finalise step can flip it before the import ever runs - so the
        empty-shell cleanup on kill must key off actual values, not that flag."""
        self.metric_type.is_complete = True
        self.metric_type.save(update_fields=["is_complete"])
        self.task.should_be_killed = True
        self.task.save()

        self._run()

        self.task.refresh_from_db()
        self.assertEqual(self.task.status, KILLED)
        self.assertFalse(MetricType.objects.filter(id=self.metric_type.id).exists())

    def test_cancelling_refresh_keeps_the_existing_metric_type_and_values(self):
        self.metric_type.is_complete = True
        self.metric_type.save(update_fields=["is_complete"])
        org_unit = OrgUnit.objects.get(source_ref="OU1")
        MetricValue.objects.create(metric_type=self.metric_type, org_unit=org_unit, value=1)
        self.task.should_be_killed = True
        self.task.save()

        self._run()

        self.task.refresh_from_db()
        self.assertEqual(self.task.status, KILLED)
        self.assertTrue(MetricType.objects.filter(id=self.metric_type.id).exists())
        self.assertEqual(MetricValue.objects.filter(metric_type=self.metric_type).count(), 1)
