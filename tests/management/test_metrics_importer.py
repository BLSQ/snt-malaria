from django.test import SimpleTestCase

from plugins.snt_malaria.management.commands.support.metrics_importer import MetricsImporter


class ParseYearTestCase(SimpleTestCase):
    def test_missing_year_column_is_timeless(self):
        self.assertIsNone(MetricsImporter._parse_year({"ADM2_ID": "1"}))

    def test_empty_year_value_is_timeless(self):
        self.assertIsNone(MetricsImporter._parse_year({"YEAR": ""}))

    def test_real_year_value_is_parsed(self):
        self.assertEqual(MetricsImporter._parse_year({"YEAR": "2025"}), 2025)
