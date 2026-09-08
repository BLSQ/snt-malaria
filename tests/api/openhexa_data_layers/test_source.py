from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from plugins.snt_malaria.api.openhexa_data_layers.source import resolve_source_file


SNT_CONFIG = {
    "SNT_CONFIG": {"COUNTRY_CODE": "COD"},
    "SNT_DATASET_IDENTIFIERS": {
        "DHIS2_DATASET_FORMATTED": "snt-dhis2-formatted",
        "DHIS2_INCIDENCE": "snt-dhis2-incidence",
        "SNT_HEALTHCARE_ACCESS": "snt-healthcare-access",
    },
}


def _definition(name="SNT_DHIS2_INCIDENCE", filename="{COUNTRY_CODE}_incidence.csv", column="INCIDENCE_CRUDE"):
    return {"SOURCE_DATA": {"DATASET": {"NAME": name, "VERSION": "latest"}, "FILENAME": filename, "COLUMN": column}}


class ResolveSourceFileTestCase(SimpleTestCase):
    def test_resolves_slug_country_code_and_column(self):
        source = resolve_source_file(_definition(), SNT_CONFIG)
        self.assertEqual(source.dataset_slug, "snt-dhis2-incidence")
        self.assertEqual(source.filename, "COD_incidence.csv")
        self.assertEqual(source.column, "INCIDENCE_CRUDE")

    def test_matches_across_the_snt_prefix_mismatch(self):
        # metadata "SNT_DHIS2_INCIDENCE" vs config key "DHIS2_INCIDENCE"
        self.assertEqual(
            resolve_source_file(_definition(name="SNT_DHIS2_INCIDENCE"), SNT_CONFIG).dataset_slug, "snt-dhis2-incidence"
        )
        # metadata "DHIS2_DATASET_FORMATTED" - exact match, no prefix either side
        self.assertEqual(
            resolve_source_file(_definition(name="DHIS2_DATASET_FORMATTED"), SNT_CONFIG).dataset_slug,
            "snt-dhis2-formatted",
        )
        # metadata "HEALTHCARE_ACCESS" vs config key "SNT_HEALTHCARE_ACCESS"
        self.assertEqual(
            resolve_source_file(_definition(name="HEALTHCARE_ACCESS"), SNT_CONFIG).dataset_slug,
            "snt-healthcare-access",
        )

    def test_unknown_dataset_identifier_raises(self):
        with self.assertRaisesMessage(ValidationError, "NOPE"):
            resolve_source_file(_definition(name="NOPE"), SNT_CONFIG)

    def test_missing_source_data_fields_raise(self):
        with self.assertRaises(ValidationError):
            resolve_source_file({"SOURCE_DATA": {"DATASET": {"NAME": "DHIS2_INCIDENCE"}}}, SNT_CONFIG)
        with self.assertRaises(ValidationError):
            resolve_source_file({}, SNT_CONFIG)

    def test_missing_country_code_raises_a_clear_error(self):
        with self.assertRaisesMessage(ValidationError, "COUNTRY_CODE"):
            resolve_source_file(_definition(), {"SNT_DATASET_IDENTIFIERS": SNT_CONFIG["SNT_DATASET_IDENTIFIERS"]})

    def test_exact_key_wins_over_a_prefix_collision(self):
        config = {
            "SNT_CONFIG": {"COUNTRY_CODE": "COD"},
            "SNT_DATASET_IDENTIFIERS": {"DHIS2_INCIDENCE": "wrong", "SNT_DHIS2_INCIDENCE": "right"},
        }
        self.assertEqual(resolve_source_file(_definition(name="SNT_DHIS2_INCIDENCE"), config).dataset_slug, "right")
