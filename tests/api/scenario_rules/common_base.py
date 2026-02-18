from django.contrib.gis.geos import MultiPolygon, Point, Polygon

from iaso.models import OrgUnit, OrgUnitType
from iaso.test import APITestCase
from plugins.snt_malaria.models import Intervention, InterventionCategory, Scenario, ScenarioRule
from plugins.snt_malaria.models.scenario import ScenarioRuleInterventionProperties
from plugins.snt_malaria.permissions import SNT_SCENARIO_BASIC_WRITE_PERMISSION, SNT_SCENARIO_FULL_WRITE_PERMISSION


class ScenarioRulesTestBase(APITestCase):
    def setUp(self):
        self.account, self.source, self.version, self.project = self.create_account_datasource_version_project(
            "source", "Test Account", "project"
        )
        self.user_with_full_perm, self.anon, self.user_no_perm = self.create_base_users(
            self.account, [SNT_SCENARIO_FULL_WRITE_PERMISSION], "user_full"
        )
        self.user_with_basic_perm = self.create_user_with_profile(
            username="user_basic", account=self.account, permissions=[SNT_SCENARIO_BASIC_WRITE_PERMISSION]
        )
        self.scenario = Scenario.objects.create(
            account=self.account,
            created_by=self.user_with_full_perm,
            name="Test Scenario",
            description="A scenario for testing",
            start_year=2020,
            end_year=2030,
        )

        self.int_category_vaccination = InterventionCategory.objects.create(
            name="Vaccination",
            account=self.account,
            created_by=self.user_with_full_perm,
        )
        self.int_category_chemoprevention = InterventionCategory.objects.create(
            name="Preventive Chemotherapy",
            account=self.account,
            created_by=self.user_with_full_perm,
        )
        self.intervention_vaccination_rts = Intervention.objects.create(
            name="RTS,S",
            created_by=self.user_with_full_perm,
            intervention_category=self.int_category_vaccination,
            code="rts_s",
        )
        self.intervention_chemo_smc = Intervention.objects.create(
            name="SMC",
            created_by=self.user_with_full_perm,
            intervention_category=self.int_category_chemoprevention,
            code="smc",
        )
        self.intervention_chemo_iptp = Intervention.objects.create(
            name="IPTp",
            created_by=self.user_with_full_perm,
            intervention_category=self.int_category_chemoprevention,
            code="iptp",
        )

        # Create Org Units
        self.point = Point(x=4, y=50, z=100)
        self.mock_multipolygon = MultiPolygon(Polygon([[-1.3, 2.5], [-1.7, 2.8], [-1.1, 4.1], [-1.3, 2.5]]))
        self.out_district = OrgUnitType.objects.create(name="DISTRICT")
        self.district_1 = OrgUnit.objects.create(
            org_unit_type=self.out_district,
            name="District 1",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=self.point,
            geom=self.mock_multipolygon,
        )
        self.district_2 = OrgUnit.objects.create(
            org_unit_type=self.out_district,
            name="District 2",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=self.point,
            geom=self.mock_multipolygon,
        )
        self.district_3 = OrgUnit.objects.create(
            org_unit_type=self.out_district,
            name="District 3",
            version=self.version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=self.point,
            geom=self.mock_multipolygon,
        )

        self.scenario_rule_1 = ScenarioRule.objects.create(
            name="Rule 1",
            priority=1,
            color="#FF0000",
            matching_criteria={"and": [{"==": [{"var": "org_unit.org_unit_type_id"}, self.out_district.id]}]},
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
            matching_criteria={"and": [{"==": [{"var": "org_unit.org_unit_type_id"}, self.out_district.id]}]},
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
        self.other_scenario = Scenario.objects.create(
            account=self.other_account,
            created_by=self.other_user,
            name="Other Scenario",
            description="A scenario for testing tenancy",
            start_year=2020,
            end_year=2030,
        )
        self.other_int_category = InterventionCategory.objects.create(
            name="Other Category",
            account=self.other_account,
            created_by=self.other_user,
        )
        self.other_intervention = Intervention.objects.create(
            name="Other Intervention",
            created_by=self.other_user,
            intervention_category=self.other_int_category,
            code="other_intervention",
        )
        self.other_out_district = OrgUnitType.objects.create(name="DISTRICT")
        self.other_district_1 = OrgUnit.objects.create(
            org_unit_type=self.other_out_district,
            name="District 1",
            version=self.other_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=self.point,
            geom=self.mock_multipolygon,
        )
        self.other_district_2 = OrgUnit.objects.create(
            org_unit_type=self.other_out_district,
            name="District 2",
            version=self.other_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=self.point,
            geom=self.mock_multipolygon,
        )
        self.other_district_3 = OrgUnit.objects.create(
            org_unit_type=self.other_out_district,
            name="District 3",
            version=self.other_version,
            validation_status=OrgUnit.VALIDATION_VALID,
            location=self.point,
            geom=self.mock_multipolygon,
        )

        self.other_scenario_rule = ScenarioRule.objects.create(
            name="Other Rule",
            priority=1,
            color="#0000FF",
            matching_criteria={"and": [{"==": [{"var": "org_unit.org_unit_type_id"}, self.other_out_district.id]}]},
            created_by=self.other_user,
            scenario=self.other_scenario,
            org_units_matched=[self.other_district_1.id, self.other_district_2.id],
            org_units_excluded=[self.other_district_2.id],
            org_units_included=[],
            org_units_scope=[],
        )
        self.other_rule_internvention = ScenarioRuleInterventionProperties.objects.create(
            scenario_rule=self.other_scenario_rule,
            intervention=self.other_intervention,
            coverage=0.90,
        )
