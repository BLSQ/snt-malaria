from unittest.mock import patch

from rest_framework import status

from iaso.models import MetricType
from iaso.models.openhexa import OpenHEXAInstance, OpenHEXAWorkspace
from plugins.snt_malaria.permissions import SNT_SETTINGS_READ_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


SAMPLE_METADATA = {
    "POPULATION": {
        "SOURCE_DATA": {
            "DATASET": {"NAME": "DHIS2_DATASET_FORMATTED", "VERSION": "latest"},
            "FILENAME": "{COUNTRY_CODE}_population.csv",
            "COLUMN": "POPULATION",
        },
        "LABEL": {"EN": "Total population (DHIS2)", "FR": "Population totale (DHIS2)"},
        "DESCRIPTION": {"EN": "Total number of people living in a given area.", "FR": "..."},
        "SOURCE": {"EN": "DHIS2", "FR": "DHIS2"},
        "UNITS": {"EN": "Number of people", "FR": "Nombre de personnes"},
        "CATEGORY": {"EN": "Variable of population and health", "FR": "..."},
        "TYPE": "Threshold",
        "SCALE": [50000, 100000, 200000, 300000, 400000, 500000],
        "UNIT_SYMBOL": None,
    },
    "INCIDENCE_CRUDE": {
        "SOURCE_DATA": {
            "DATASET": {"NAME": "SNT_DHIS2_INCIDENCE", "VERSION": "latest"},
            "FILENAME": "{COUNTRY_CODE}_incidence.csv",
            "COLUMN": "INCIDENCE_CRUDE",
        },
        "LABEL": {"EN": "Crude incidence (DHIS2)", "FR": "Incidence brute (DHIS2)"},
        "DESCRIPTION": {"EN": "Number of malaria cases relative to the population.", "FR": "..."},
        "SOURCE": {"EN": "DHIS2", "FR": "DHIS2"},
        "UNITS": {"EN": "Per 1000 people", "FR": "Pour 1000 personnes"},
        "CATEGORY": {"EN": "Epidemiological indicators", "FR": "Indicateurs épidémiologiques"},
        "TYPE": "Threshold",
        "SCALE": [50, 150, 250, 350, 450, 1000],
        "UNIT_SYMBOL": None,
    },
    "REPORTING_RATE_DATASET": {
        "SOURCE_DATA": {
            "DATASET": {"NAME": "SNT_DHIS2_REPORTING_RATE", "VERSION": "latest"},
            "FILENAME": "{COUNTRY_CODE}_reporting_rate_dataset.csv",
            "COLUMN": "REPORTING_RATE",
        },
        "LABEL": {"EN": "", "FR": "Taux de rapportage (DHIS2)"},
        "DESCRIPTION": {"EN": "", "FR": "Nombre de rapports reçus."},
        "SOURCE": {"EN": "", "FR": "DHIS2"},
        "UNITS": {"EN": "Proportion", "FR": ""},
        "CATEGORY": {"EN": "", "FR": "Qualité des données"},
        "TYPE": "Threshold",
        "SCALE": [0.25, 0.5, 0.75],
        "UNIT_SYMBOL": "%",
    },
}

FETCH_PATH = "plugins.snt_malaria.api.openhexa_data_layers.views.fetch_data_layer_metadata"


class OpenHexaDataLayerViewSetTestCase(SNTMalariaAPITestCase):
    BASE_URL = "/api/snt_malaria/openhexa/data_layers/"

    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.source, self.version, self.project = self.create_account_datasource_version_project(
            "source", "Test Account", "project"
        )
        self.user = self.create_user_with_profile(
            username="user", account=self.account, permissions=[SNT_SETTINGS_READ_PERMISSION]
        )
        self.user_no_perms = self.create_user_with_profile(
            username="user_no_perms", account=self.account, permissions=[]
        )
        instance = OpenHEXAInstance.objects.create(
            name="Test OpenHEXA", url="https://test.openhexa.org/graphql/", token="test-token"
        )
        self.workspace = OpenHEXAWorkspace.objects.create(
            openhexa_instance=instance,
            account=self.account,
            slug="snt-testing",
            config={"snt_configuration_dataset": "snt-configuration"},
        )

    def test_requires_authentication(self):
        response = self.client.get(self.BASE_URL)
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_requires_snt_settings_permission(self):
        self.client.force_authenticate(self.user_no_perms)
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch(FETCH_PATH, return_value=SAMPLE_METADATA)
    def test_lists_data_layers_from_metadata_file(self, _mock_fetch):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.BASE_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        self.assertEqual([layer["code"] for layer in results], list(SAMPLE_METADATA.keys()))

        incidence = next(layer for layer in results if layer["code"] == "INCIDENCE_CRUDE")
        self.assertEqual(incidence["name"], "Crude incidence (DHIS2)")
        self.assertEqual(incidence["category"], "Epidemiological indicators")
        self.assertEqual(incidence["units"], "Per 1000 people")
        self.assertEqual(incidence["legend_type"], "threshold")
        self.assertEqual(incidence["legend_config"]["domain"], [50, 150, 250, 350, 450, 1000])
        self.assertEqual(len(incidence["legend_config"]["range"]), 7)
        self.assertEqual(incidence["metric_kind"], "any")

    @patch(FETCH_PATH, return_value=SAMPLE_METADATA)
    def test_population_layer_is_flagged_from_column(self, _mock_fetch):
        self.client.force_authenticate(self.user)
        results = self.client.get(self.BASE_URL).json()["results"]

        population = next(layer for layer in results if layer["code"] == "POPULATION")
        self.assertEqual(population["metric_kind"], "population")

    @patch(FETCH_PATH, return_value=SAMPLE_METADATA)
    def test_falls_back_to_french_when_english_label_is_blank(self, _mock_fetch):
        self.client.force_authenticate(self.user)
        results = self.client.get(self.BASE_URL).json()["results"]

        reporting_rate = next(layer for layer in results if layer["code"] == "REPORTING_RATE_DATASET")
        self.assertEqual(reporting_rate["name"], "Taux de rapportage (DHIS2)")
        self.assertEqual(reporting_rate["category"], "Qualité des données")
        self.assertEqual(reporting_rate["units"], "Proportion")
        self.assertEqual(reporting_rate["unit_symbol"], "%")

    @patch(
        FETCH_PATH,
        return_value={
            "OK_LAYER": SAMPLE_METADATA["INCIDENCE_CRUDE"],
            "BAD_SCALE": {**SAMPLE_METADATA["INCIDENCE_CRUDE"], "SCALE": 5},
            "BAD_SOURCE_DATA": {**SAMPLE_METADATA["INCIDENCE_CRUDE"], "SOURCE_DATA": ["x"]},
            "BAD_LABEL": {**SAMPLE_METADATA["INCIDENCE_CRUDE"], "LABEL": {"EN": 5}},
        },
    )
    def test_tolerates_malformed_entries_in_the_metadata_file(self, _mock_fetch):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.BASE_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        codes = [layer["code"] for layer in response.json()["results"]]
        self.assertIn("OK_LAYER", codes)
        bad_label = next(layer for layer in response.json()["results"] if layer["code"] == "BAD_LABEL")
        self.assertEqual(bad_label["name"], "BAD_LABEL")

    @patch(
        FETCH_PATH,
        return_value={
            "GOOD": SAMPLE_METADATA["INCIDENCE_CRUDE"],
            "TOO_MANY_BREAKS": {
                **SAMPLE_METADATA["INCIDENCE_CRUDE"],
                "SCALE": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            },
        },
    )
    def test_flags_layers_whose_scale_does_not_fit_the_legend_type(self, _mock_fetch):
        self.client.force_authenticate(self.user)
        results = self.client.get(self.BASE_URL).json()["results"]

        good = next(layer for layer in results if layer["code"] == "GOOD")
        self.assertEqual(good["error"], "")
        flagged = next(layer for layer in results if layer["code"] == "TOO_MANY_BREAKS")
        self.assertIn("2-9", flagged["error"])
        self.assertIn("10", flagged["error"])

    def test_returns_422_when_config_key_is_missing(self):
        self.workspace.config = {}
        self.workspace.save()
        self.client.force_authenticate(self.user)

        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn("snt_configuration_dataset", response.json()["error"])

    def test_returns_422_when_no_openhexa_workspace(self):
        self.workspace.delete()
        self.client.force_authenticate(self.user)

        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

    @patch(FETCH_PATH, side_effect=RuntimeError("boom"))
    def test_returns_502_when_openhexa_fetch_fails(self, _mock_fetch):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)


class OpenHexaMetricTypeShellTestCase(SNTMalariaAPITestCase):
    """Phase 1 creates the MetricType shell through the existing endpoint; no values yet."""

    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.source, self.version, self.project = self.create_account_datasource_version_project(
            "source", "Test Account", "project"
        )
        from iaso.permissions.core_permissions import CORE_METRIC_TYPES_PERMISSION

        self.user = self.create_user_with_profile(
            username="user", account=self.account, permissions=[CORE_METRIC_TYPES_PERMISSION]
        )

    def test_create_openhexa_metric_type_without_values(self):
        self.client.force_authenticate(self.user)
        payload = {
            "code": "INCIDENCE_CRUDE",
            "name": "Crude incidence (DHIS2)",
            "category": "Epidemiological indicators",
            "description": "Number of malaria cases relative to the population.",
            "units": "Per 1000 people",
            "unit_symbol": "",
            "legend_type": "threshold",
            "metric_kind": "any",
            "origin": "openhexa",
            "legend_config": {
                "domain": [50, 150, 250, 350, 450, 1000],
                "range": ["#A2CAEA", "#6BD39D", "#ACDF9B", "#F5F1A0", "#F2B16E", "#E4754F", "#A93A42"],
            },
        }
        response = self.client.post("/api/metrictypes/", data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

        metric_type = MetricType.objects.get(account=self.account, code="INCIDENCE_CRUDE")
        self.assertEqual(metric_type.origin, MetricType.MetricTypeOrigin.OPENHEXA)
        self.assertEqual(metric_type.metricvalue_set.count(), 0)
