from django.test import SimpleTestCase

from plugins.snt_malaria.api.openhexa_data_layers.jsonc import loads_jsonc
from plugins.snt_malaria.api.openhexa_data_layers.metadata import parse_data_layers


RAW_METADATA = """
{
    // Population layer - flagged from its source column
    "POPULATION": {
        "SOURCE_DATA": { "COLUMN": "POPULATION" },
        "LABEL": { "EN": "Total population (DHIS2)", "FR": "Population totale (DHIS2)" },
        "CATEGORY": { "EN": "Population", "FR": "Population" },
        "UNITS": { "EN": "Number of people", "FR": "Nombre de personnes" },
        "TYPE": "Threshold",
        "SCALE": [50000, 100000, 200000], // limits are added by the SNT Explorer
        "UNIT_SYMBOL": null,
    },
    "REPORTING_RATE_DATASET": {
        "SOURCE_DATA": { "COLUMN": "REPORTING_RATE" },
        "LABEL": { "EN": "", "FR": "Taux de rapportage (DHIS2)" },
        "CATEGORY": { "EN": "", "FR": "Qualité des données" },
        "UNITS": { "EN": "Proportion", "FR": "" },
        "TYPE": "Threshold",
        "SCALE": [0.25, 0.5, 0.75],
        "UNIT_SYMBOL": "%",
    },
}
"""


class MetadataParsingTestCase(SimpleTestCase):
    def setUp(self):
        self.layers = {layer["code"]: layer for layer in parse_data_layers(loads_jsonc(RAW_METADATA))}

    def test_keeps_one_layer_per_top_level_key(self):
        self.assertEqual(list(self.layers), ["POPULATION", "REPORTING_RATE_DATASET"])

    def test_population_layer_is_flagged_from_column(self):
        self.assertEqual(self.layers["POPULATION"]["metric_kind"], "population")
        self.assertEqual(self.layers["REPORTING_RATE_DATASET"]["metric_kind"], "any")

    def test_threshold_legend_config_has_one_extra_colour(self):
        legend_config = self.layers["POPULATION"]["legend_config"]
        self.assertEqual(legend_config["domain"], [50000, 100000, 200000])
        self.assertEqual(len(legend_config["range"]), 4)

    def test_english_first_with_french_fallback(self):
        reporting_rate = self.layers["REPORTING_RATE_DATASET"]
        self.assertEqual(reporting_rate["name"], "Taux de rapportage (DHIS2)")
        self.assertEqual(reporting_rate["category"], "Qualité des données")
        self.assertEqual(reporting_rate["units"], "Proportion")
        self.assertEqual(reporting_rate["unit_symbol"], "%")

    def test_null_unit_symbol_becomes_empty_string(self):
        self.assertEqual(self.layers["POPULATION"]["unit_symbol"], "")


class JsoncTestCase(SimpleTestCase):
    def test_strips_line_and_block_comments_and_trailing_commas(self):
        parsed = loads_jsonc('{ /* x */ "a": 1, // y\n "b": [1, 2,], }')
        self.assertEqual(parsed, {"a": 1, "b": [1, 2]})

    def test_keeps_comment_like_content_inside_strings(self):
        parsed = loads_jsonc('{ "url": "https://example.org/a//b", "note": "1,2,]" }')
        self.assertEqual(parsed, {"url": "https://example.org/a//b", "note": "1,2,]"})
