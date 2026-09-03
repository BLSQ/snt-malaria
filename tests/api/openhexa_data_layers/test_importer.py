from django.core.exceptions import ValidationError

from iaso.models import MetricType, MetricValue, OrgUnit
from plugins.snt_malaria.api.openhexa_data_layers.importer import import_metric_values
from plugins.snt_malaria.tests.common_base import SNTMalariaTestCase


class ImportMetricValuesTestCase(SNTMalariaTestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.source, self.version, self.project = self.create_account_datasource_version_project(
            "source", "Test Account", "project"
        )
        ou_type = self.create_snt_org_unit_type(name="DISTRICT")
        self.ou1 = self.create_snt_org_unit(
            org_unit_type=ou_type,
            name="D1",
            version=self.version,
            source_ref="OU1",
            validation_status=OrgUnit.VALIDATION_VALID,
        )
        self.ou2 = self.create_snt_org_unit(
            org_unit_type=ou_type,
            name="D2",
            version=self.version,
            source_ref="OU2",
            validation_status=OrgUnit.VALIDATION_VALID,
        )
        self.metric_type = MetricType.objects.create(
            account=self.account, code="INCIDENCE_CRUDE", name="Crude incidence", legend_type="threshold"
        )

    def test_imports_rows_matched_by_source_ref(self):
        csv_text = "ADM2_ID,INCIDENCE_CRUDE\nOU1,12.5\nOU2,3\nUNKNOWN,99\n"
        count = import_metric_values(self.metric_type, csv_text, "INCIDENCE_CRUDE")

        self.assertEqual(count, 2)
        self.assertEqual(MetricValue.objects.get(metric_type=self.metric_type, org_unit=self.ou1).value, 12.5)
        self.assertEqual(MetricValue.objects.get(metric_type=self.metric_type, org_unit=self.ou2).value, 3.0)

    def test_year_column_is_respected_else_timeless(self):
        with_year = "ADM2_ID,YEAR,INCIDENCE_CRUDE\nOU1,2024,10\n"
        import_metric_values(self.metric_type, with_year, "INCIDENCE_CRUDE")
        self.assertEqual(MetricValue.objects.get(metric_type=self.metric_type).year, 2024)

        timeless = "ADM2_ID,INCIDENCE_CRUDE\nOU1,10\n"
        import_metric_values(self.metric_type, timeless, "INCIDENCE_CRUDE")
        self.assertIsNone(MetricValue.objects.get(metric_type=self.metric_type).year)

    def test_non_numeric_value_goes_to_string_value(self):
        import_metric_values(self.metric_type, "ADM2_ID,INCIDENCE_CRUDE\nOU1,high\n", "INCIDENCE_CRUDE")
        value = MetricValue.objects.get(metric_type=self.metric_type)
        self.assertIsNone(value.value)
        self.assertEqual(value.string_value, "high")

    def test_reimport_replaces_previous_values_for_this_type_only(self):
        other = MetricType.objects.create(account=self.account, code="OTHER", name="Other", legend_type="threshold")
        MetricValue.objects.create(metric_type=other, org_unit=self.ou1, value=1)

        import_metric_values(self.metric_type, "ADM2_ID,INCIDENCE_CRUDE\nOU1,1\nOU2,2\n", "INCIDENCE_CRUDE")
        import_metric_values(self.metric_type, "ADM2_ID,INCIDENCE_CRUDE\nOU1,9\n", "INCIDENCE_CRUDE")

        self.assertEqual(MetricValue.objects.filter(metric_type=self.metric_type).count(), 1)
        self.assertEqual(MetricValue.objects.get(metric_type=self.metric_type).value, 9.0)
        self.assertEqual(MetricValue.objects.filter(metric_type=other).count(), 1)

    def test_duplicate_org_unit_year_rows_keep_the_last(self):
        import_metric_values(self.metric_type, "ADM2_ID,INCIDENCE_CRUDE\nOU1,1\nOU1,2\n", "INCIDENCE_CRUDE")
        self.assertEqual(MetricValue.objects.get(metric_type=self.metric_type).value, 2.0)

    def test_missing_column_raises(self):
        with self.assertRaises(ValidationError):
            import_metric_values(self.metric_type, "ADM2_ID,SOMETHING\nOU1,1\n", "INCIDENCE_CRUDE")
        with self.assertRaises(ValidationError):
            import_metric_values(self.metric_type, "WRONG_ID,INCIDENCE_CRUDE\nOU1,1\n", "INCIDENCE_CRUDE")
