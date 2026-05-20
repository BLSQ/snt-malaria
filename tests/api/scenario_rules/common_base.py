from django.contrib.gis.geos import MultiPolygon, Point, Polygon

from iaso.models import MetricType, MetricValue, OrgUnit
from plugins.snt_malaria.models import ScenarioRule
from plugins.snt_malaria.models.scenario import ScenarioRuleInterventionProperties
from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION, SNT_SCENARIO_FULL_WRITE_PERMISSION
from plugins.snt_malaria.tests.common_base import SNTMalariaAPITestCase


class ScenarioRulesTestBase(SNTMalariaAPITestCase):
    auto_create_account = False

    def setUp(self):
        super().setUp()
        self.account, self.source, self.version, self.project = self.create_account_datasource_version_project(
            "source", "Test Account", "project"
        )
        self.user_with_full_perm, self.anon, self.user_no_perm = self.create_base_users(
            self.account, [SNT_SCENARIO_FULL_WRITE_PERMISSION], "user_full"
        )
        self.user_with_basic_perm = self.create_user_with_profile(
            username="user_basic", account=self.account, permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION]
        )
        self.scenario = self.create_snt_scenario(
            account=self.account,
            created_by=self.user_with_full_perm,
            name="Test Scenario",
            start_year=2020,
            end_year=2030,
        )

        self.int_category_vaccination = self.create_snt_intervention_category(
            name="Vaccination",
            account=self.account,
            created_by=self.user_with_full_perm,
        )
        self.int_category_chemoprevention = self.create_snt_intervention_category(
            name="Preventive Chemotherapy",
            account=self.account,
            created_by=self.user_with_full_perm,
        )
        self.intervention_vaccination_rts = self.create_snt_intervention(
            name="RTS,S",
            code="rts_s",
            intervention_category=self.int_category_vaccination,
            created_by=self.user_with_full_perm,
        )
        self.intervention_chemo_smc = self.create_snt_intervention(
            name="SMC",
            code="smc",
            intervention_category=self.int_category_chemoprevention,
            created_by=self.user_with_full_perm,
        )
        self.intervention_chemo_iptp = self.create_snt_intervention(
            name="IPTp",
            code="iptp",
            intervention_category=self.int_category_chemoprevention,
            created_by=self.user_with_full_perm,
        )

        # Create Org Units
        self.point = Point(x=4, y=50, z=100)
        self.mock_multipolygon = MultiPolygon(Polygon([[-1.3, 2.5], [-1.7, 2.8], [-1.1, 4.1], [-1.3, 2.5]]))
        self.out_district = self.create_snt_org_unit_type(name="DISTRICT")
        self.district_1 = self.create_snt_org_unit(
            org_unit_type=self.out_district,
            name="District 1",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=self.point,
            geom=self.mock_multipolygon,
        )
        self.district_2 = self.create_snt_org_unit(
            org_unit_type=self.out_district,
            name="District 2",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=self.point,
            geom=self.mock_multipolygon,
        )
        self.district_3 = self.create_snt_org_unit(
            org_unit_type=self.out_district,
            name="District 3",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=self.point,
            geom=self.mock_multipolygon,
        )

        self.metric_type_population = MetricType.objects.create(
            account=self.account,
            name="Total Population",
            code="POPULATION",
            description="Total population data",
            units="people",
        )
        self.metric_type_pop_under_5 = MetricType.objects.create(
            account=self.account,
            name="Total Population",
            code="POP_UNDER_5",
            description="Population under 5 year",
            units="child",
        )

        self.metric_value_district_1_pop = MetricValue.objects.create(
            metric_type=self.metric_type_population, org_unit=self.district_1, value=10000000, year=2025
        )
        self.metric_value_district_2_pop = MetricValue.objects.create(
            metric_type=self.metric_type_population, org_unit=self.district_2, value=15000000, year=2025
        )
        self.metric_value_district_3_pop = MetricValue.objects.create(
            metric_type=self.metric_type_population, org_unit=self.district_3, value=20000000, year=2025
        )
        self.metric_value_district_1_pop_under_5 = MetricValue.objects.create(
            metric_type=self.metric_type_pop_under_5, org_unit=self.district_1, value=100000, year=2025
        )
        self.metric_value_district_2_pop_under_5 = MetricValue.objects.create(
            metric_type=self.metric_type_pop_under_5, org_unit=self.district_2, value=150000, year=2025
        )
        self.metric_value_district_3_pop_under_5 = MetricValue.objects.create(
            metric_type=self.metric_type_pop_under_5, org_unit=self.district_3, value=200000, year=2025
        )

        self.scenario_rule_1 = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria={
                "and": [{"<=": [{"var": self.metric_type_population.id}, self.metric_value_district_2_pop.value]}]
            },
            created_by=self.user_with_full_perm,
            scenario=self.scenario,
            org_units_matched=[self.district_1.id, self.district_2.id],
            org_units_excluded=[self.district_2.id],
            org_units_included=[],
            org_units_scope=[],
        )
        self.rule_intervention_1 = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.scenario_rule_1,
            intervention=self.intervention_vaccination_rts,
            coverage=0.80,
        )
        self.rule_intervention_2 = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.scenario_rule_1,
            intervention=self.intervention_chemo_smc,
            coverage=0.50,
        )
        self.scenario_rule_2 = ScenarioRule.objects.create(
            name="Rule 2",
            priority=2,
            color="#00FF00",
            matching_criteria={"and": [{"==": [{"var": 2}, self.out_district.id]}]},
            created_by=self.user_with_full_perm,
            scenario=self.scenario,
            org_units_matched=[self.district_1.id, self.district_2.id],
            org_units_excluded=[],
            org_units_included=[self.district_3.id],
            org_units_scope=[],
        )
        self.rule_intervention_3 = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.scenario_rule_2,
            intervention=self.intervention_chemo_iptp,
            coverage=0.70,
        )

        # Other setup for tenancy tests
        self.other_account, self.other_source, self.other_version, self.other_project = (
            self.create_account_datasource_version_project("other source", "other account", "other project")
        )
        self.other_user = self.create_user_with_profile(
            username="other_user", account=self.other_account, permissions=[SNT_SCENARIO_FULL_WRITE_PERMISSION]
        )
        self.other_scenario = self.create_snt_scenario(
            account=self.other_account,
            created_by=self.other_user,
            name="Other Scenario",
            start_year=2020,
            end_year=2030,
        )
        self.other_int_category = self.create_snt_intervention_category(
            name="Other Category",
            account=self.other_account,
            created_by=self.other_user,
        )
        self.other_intervention = self.create_snt_intervention(
            name="Other Intervention",
            code="other_intervention",
            intervention_category=self.other_int_category,
            created_by=self.other_user,
        )
        self.other_out_district = self.create_snt_org_unit_type(name="DISTRICT")
        self.other_district_1 = self.create_snt_org_unit(
            org_unit_type=self.other_out_district,
            name="District 1",
            version=self.other_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=self.point,
            geom=self.mock_multipolygon,
        )
        self.other_district_2 = self.create_snt_org_unit(
            org_unit_type=self.other_out_district,
            name="District 2",
            version=self.other_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=self.point,
            geom=self.mock_multipolygon,
        )
        self.other_district_3 = self.create_snt_org_unit(
            org_unit_type=self.other_out_district,
            name="District 3",
            version=self.other_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=self.point,
            geom=self.mock_multipolygon,
        )
        self.other_metric_type_population = MetricType.objects.create(
            account=self.other_account,
            name="Total Population",
            code="POPULATION",
            description="Total population data - account 2",
            units="people",
        )
        self.other_metric_type_pop_under_5 = MetricType.objects.create(
            account=self.other_account,
            name="Total Population",
            code="POP_UNDER_5",
            description="Population under 5 year - account 2",
            units="child",
        )

        self.other_metric_value_district_1_pop = MetricValue.objects.create(
            metric_type=self.other_metric_type_population, org_unit=self.other_district_1, value=10000, year=2025
        )
        self.other_metric_value_district_2_pop = MetricValue.objects.create(
            metric_type=self.other_metric_type_population, org_unit=self.other_district_2, value=15000, year=2025
        )
        self.other_metric_value_district_3_pop = MetricValue.objects.create(
            metric_type=self.other_metric_type_population, org_unit=self.other_district_3, value=20000, year=2025
        )
        self.other_metric_value_district_1_pop_under_5 = MetricValue.objects.create(
            metric_type=self.other_metric_type_pop_under_5, org_unit=self.other_district_1, value=100, year=2025
        )
        self.other_metric_value_district_2_pop_under_5 = MetricValue.objects.create(
            metric_type=self.other_metric_type_pop_under_5, org_unit=self.other_district_2, value=150, year=2025
        )
        self.other_metric_value_district_3_pop_under_5 = MetricValue.objects.create(
            metric_type=self.other_metric_type_pop_under_5, org_unit=self.other_district_3, value=200, year=2025
        )

        self.other_scenario_rule = ScenarioRule.objects.create(
            name="Other Rule",
            priority=1,
            color="#0000FF",
            matching_criteria={
                "and": [
                    {
                        ">=": [
                            {"var": self.other_metric_type_pop_under_5.id},
                            self.other_metric_value_district_1_pop_under_5.value,
                        ]
                    }
                ]
            },
            created_by=self.other_user,
            scenario=self.other_scenario,
            org_units_matched=[self.other_district_1.id, self.other_district_2.id, self.other_district_3.id],
            org_units_excluded=[self.other_district_2.id],
            org_units_included=[],
            org_units_scope=[],
        )
        self.other_rule_intervention = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.other_scenario_rule,
            intervention=self.other_intervention,
            coverage=0.90,
        )

    def lock_scenario(self, scenario):
        scenario.is_locked = True
        scenario.save()
