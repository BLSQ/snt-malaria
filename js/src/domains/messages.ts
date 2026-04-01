import { defineMessages } from 'react-intl';

export const MESSAGES = defineMessages({
    add: {
        id: 'iaso.snt_malaria.label.interventionList.add',
        defaultMessage: 'Add',
    },
    addInterventionProperty: {
        id: 'iaso.snt_malaria.scenarioRule.addInterventionProperty',
        defaultMessage: 'Add intervention',
    },
    addMap: {
        id: 'iaso.snt_malaria.label.addMap',
        defaultMessage: 'Add a covariant map',
    },
    addMatchingCriteria: {
        id: 'iaso.snt_malaria.scenarioRule.addMatchingCriteria',
        defaultMessage: 'Add Criteria',
    },
    addToPlan: {
        id: 'iaso.snt_malaria.label.interventionList.addToPlan',
        defaultMessage: 'Add to plan',
    },
    ageGroupLabel: {
        id: 'iaso.snt_malaria.compareCustomize.ageGroupLabel',
        defaultMessage: 'Age group',
    },
    allDisplayLevels: {
        id: 'iaso.snt_malaria.label.allDisplayLevels',
        defaultMessage: 'All',
    },
    allInterventionCategories: {
        id: 'iaso.snt_malaria.label.allInterventionCategories',
        defaultMessage: 'All intervention categories',
    },
    allInterventions: {
        id: 'iaso.snt_malaria.label.allInterventions',
        defaultMessage: 'All interventions',
    },
    allOrgUnits: {
        id: 'iaso.snt_malaria.label.allOrgUnits',
        defaultMessage: 'All',
    },
    allParentOrgUnits: {
        id: 'iaso.snt_malaria.label.allParentOrgUnits',
        defaultMessage: 'All',
    },
    above: {
        id: 'iaso.snt_malaria.label.layers.above',
        defaultMessage: 'Above',
    },
    apply: {
        id: 'iaso.snt_malaria.label.apply',
        defaultMessage: 'Apply',
    },
    baselineLabel: {
        id: 'iaso.snt_malaria.scenarios.baseline',
        defaultMessage: 'Baseline',
    },
    budget: {
        id: 'iaso.snt_malaria.budgeting.budget',
        defaultMessage: 'Budget',
    },
    budgetAssumptionsBaleSize: {
        id: 'iaso.snt_malaria.budgetAssumptions.bale_size',
        defaultMessage: 'Bale Sz.',
    },
    budgetAssumptionsBuffer: {
        id: 'iaso.snt_malaria.budgetAssumptions.buffer',
        defaultMessage: 'Buffer',
    },
    budgetAssumptionsCoverage: {
        id: 'iaso.snt_malaria.budgetAssumptions.coverage',
        defaultMessage: 'Coverage',
    },
    budgetAssumptionsDescription_itn_campaign: {
        id: 'iaso.snt_malaria.budgetAssumptions.description.itn_campaign',
        defaultMessage: `To estimate the number of insecticide-treated nets (ITNs) needed for campaign delivery in targeted areas:<br></br>
            The <b>target population</b> (default: total pop) of the area is multiplied by the <b>target intervention coverage</b>
            (default: 100%) to estimate the target population for the campaign and then divided by the <b>number of people
            assumed to use 1 net</b> (default: 1.8). A <b>buffer</b> (default: 10%) is applied to account for wastage and contingency.
            The number of <b>bales</b> is calculated by dividing the number of nets by 50 (assuming 50 nets per bale).`,
    },
    budgetAssumptionsDescription_itn_routine: {
        id: 'iaso.snt_malaria.budgetAssumptions.description.itn_routine',
        defaultMessage: `To estimate the number of nets needed for routine delivery channels often through ANC and EPI
        services, the <b>target population</b> (default: total under 5 and pregnant women population) of an area is multiplied
        by the <b>expected routine distribution coverage</b> (default: 30%) and a <b>procurement buffer</b> (default: 10%).`,
    },
    budgetAssumptionsDescription_iptp: {
        id: 'iaso.snt_malaria.budgetAssumptions.description.iptp',
        defaultMessage: `To estimate the amount of SP (blister packs of 3 pills) to procure for IPTp
        we take the <b>target population</b> (default: pregnant women) of an area,
        multiply by the <b>expected coverage at ANC attendence</b> (default: 80%) for the scheduled number of <b>touchpoints</b>
        per woman (default: 3) and multiply this by a <b>procurement buffer</b> (default: 10%).`,
    },
    budgetAssumptionsDescription_pmc: {
        id: 'iaso.snt_malaria.budgetAssumptions.description.pmc',
        defaultMessage: `To estimate the quantity of sulfadoxine-pyrimethamine (SP) required for Perennial Malaria Chemoprevention (PMC),
        we assume delivery is integrated into routine Expanded Programme on Immunization (EPI).
        Each eligible child receives SP at four routine immunization touchpoints per year, with age-specific dosing:
        <ul>
        <li>Children aged <b>0-1 years</b> receive 1 tablet of SP per contact.</li>

        <li>Children aged <b>1-2 years</b> receive 2 tablets of SP per contact.</li>
        </ul>
        To account for <b>underdosing due to low weight</b>, which affects approximately <b>25% of children in each age group</b>,
        a <b>scaling factor of 0.75</b> is applied to both age groups.
        This factor reflects the average reduction in tablets required due to dose adjustment (e.g., half tablets for underweight infants).

        An <b>85% coverage rate</b> is assumed and a <b>10% procurement buffer</b> is then included to cover wastage, re-dosing, and stockouts.`,
    },
    budgetAssumptionsDescription_smc: {
        id: 'iaso.snt_malaria.budgetAssumptions.description.smc',
        defaultMessage: `To estimate the number of SP+AQ co-blistered packets required for Seasonal Malaria Chemoprevention (SMC),
        we use the following methodology with the default assumptions included here for clarity.
        We first assume each packet contains one full course for a single cycle (1 tablet of SP and 3 tablets of AQ).
        SMC is at default delivered over 4 <b>monthly cycles</b> and targets two age groups:
        children aged 3 to <12 months and children aged >12 to 59 months.
        We include the distribution of age-groups as the procurement costs of the co-blistered packets
        for these different age groups vary as a result of the age-based dosing requirements for SMC drugs.

        We first estimate the <b>target population</b> by applying fixed proportions to the total number of children under 5 years of age.
        <b>Coverage</b> of the target population is assumed to be 100%, unless otherwise specified,
        and is applied before the buffer is calculated. A <b>10% buffer</b> is then included to account for re-dosing, wastage, and the treatment of children from outside the catchment area.`,
    },
    budgetAssumptionsDescription_vacc: {
        id: 'iaso.snt_malaria.budgetAssumptions.description.vacc',
        defaultMessage: `To estimate the number of malaria vaccine doses required, at default,
        we assume each eligible child will receive a <b>4-dose schedule</b>.
        Assuming the first three doses are delivered monthly and start around 5 months of age and the 4th dose is delivered ~12 - 15 months following the 3rd dose.
        The vaccine is delivered through routine immunization contacts with an <b>expected coverage of 84%</b> among the target population.
        A 10% buffer is included to account for losses during transportation, storage, and administration.`,
    },
    budgetAssumptionsDosesPerChild: {
        id: 'iaso.snt_malaria.budgetAssumptions.doses_per_child',
        defaultMessage: 'Child Doses',
    },
    budgetAssumptionsDosesPerPW: {
        id: 'iaso.snt_malaria.budgetAssumptions.doses_per_pw',
        defaultMessage: 'PW Doses',
    },
    budgetAssumptionsLabel: {
        id: 'iaso.snt_malaria.budgetAssumptions.label',
        defaultMessage: 'Budget settings',
    },
    budgetAssumptionsMaxValue: {
        id: 'iaso.snt_malaria.budgetAssumptions.maxValue',
        defaultMessage: 'Value must be at most {max}',
    },
    budgetAssumptionsMinValue: {
        id: 'iaso.snt_malaria.budgetAssumptions.minValue',
        defaultMessage: 'Value must be at least {min}',
    },
    budgetAssumptionsMonthlyRound: {
        id: 'iaso.snt_malaria.budgetAssumptions.monthly_round',
        defaultMessage: 'Cycles',
    },
    budgetAssumptionsPath: {
        id: 'iaso.snt_malaria.budgetAssumptions.path',
        defaultMessage:
            'Budgeting methodology based on tools and documentation developed by PATH.',
    },
    budgetAssumptionsPopProp12_59: {
        id: 'iaso.snt_malaria.budgetAssumptions.pop_prop_12_59',
        defaultMessage: '12-59mo',
    },
    budgetAssumptionsPopProp3_11: {
        id: 'iaso.snt_malaria.budgetAssumptions.pop_prop_3_11',
        defaultMessage: '3-11mo',
    },
    budgetAssumptionsPPN: {
        id: 'iaso.snt_malaria.budgetAssumptions.ppn',
        defaultMessage: 'PPN',
    },
    budgetAssumptionsSave: {
        id: 'iaso.snt_malaria.budgetAssumptions.save',
        defaultMessage: 'Save Settings',
    },
    budgetAssumptionsTabletFactor: {
        id: 'iaso.snt_malaria.budgetAssumptions.tablet_factor',
        defaultMessage: 'Tablet Fac.',
    },
    budgetAssumptionsTouchpoints: {
        id: 'iaso.snt_malaria.budgetAssumptions.touchpoints',
        defaultMessage: 'Tp.',
    },
    budgetByCategoryTitle: {
        id: 'iaso.snt_malaria.compareCustomize.budgetByCategoryTitle',
        defaultMessage: 'Budget by Category',
    },
    budgetView: {
        id: 'iaso.snt_malaria.label.budgetView',
        defaultMessage: 'Budget',
    },
    cancel: {
        defaultMessage: 'Cancel',
        id: 'iaso.label.cancel',
    },
    changeTo: {
        id: 'iaso.snt_malaria.label.changeTo',
        defaultMessage: 'Change to...',
    },
    clearOrgUnitSelection: {
        id: 'iaso.snt_malaria.label.clearOrgUnitSelection',
        defaultMessage: 'Clear selection',
    },
    clearSelectionTooltip: {
        id: 'iaso.snt_malaria.label.clearSelectionTooltip',
        defaultMessage: 'Clear selection',
    },
    clearedMapSelection: {
        id: 'iaso.snt_malaria.label.clearedMapSelection',
        defaultMessage: 'Map selection has been cleared',
    },
    compareCustomizeTitle: {
        id: 'iaso.snt_malaria.compareCustomize.title',
        defaultMessage: 'Compare & Customize',
    },
    compareScenariosLabel: {
        id: 'iaso.snt_malaria.scenarios.compare',
        defaultMessage: 'Compare scenarios',
    },
    costBreakdownChartTitle: {
        id: 'iaso.snt_malaria.cost-breakdown-chart.title',
        defaultMessage: 'Cost per intervention category',
    },
    costPerAvertedCaseTitle: {
        id: 'iaso.snt_malaria.compareCustomize.costPerAvertedCaseTitle',
        defaultMessage: 'Cost per averted case',
    },
    create: {
        defaultMessage: 'Create',
        id: 'iaso.label.create',
    },
    createScenario: {
        id: 'iaso.snt_malaria.scenario.createScenario',
        defaultMessage: 'Create Scenario',
    },
    createScenarioRule: {
        id: 'iaso.snt_malaria.scenarioRule.create',
        defaultMessage: 'Create rule',
    },
    customize: {
        id: 'iaso.snt_malaria.label.customize',
        defaultMessage: 'Customize',
    },
    customizeTooltip: {
        id: 'iaso.snt_malaria.label.customizeTooltip',
        defaultMessage:
            'Enable / Disable modification of plan from the map by clicking on a district',
    },
    deleteScenarioRule: {
        id: 'iaso.snt_malaria.scenarioRule.delete',
        defaultMessage: 'Delete rule',
    },
    deleteScenarioRuleConfirmMessage: {
        id: 'iaso.snt_malaria.scenarioRule.deleteConfirmMessage',
        defaultMessage: 'Do you really want to delete this scenario rule?',
    },
    deleteScenarioRuleError: {
        id: 'iaso.snt_malaria.scenarioRule.deleteError',
        defaultMessage: 'Error deleting scenario rule',
    },
    deleteScenarioRuleSuccess: {
        id: 'iaso.snt_malaria.scenarioRule.deleteSuccess',
        defaultMessage: 'Scenario rule deleted successfully',
    },
    description: {
        id: 'iaso.snt_malaria.label.description',
        defaultMessage: 'Description',
    },
    displayLevel: {
        id: 'iaso.snt_malaria.label.displayLevel',
        defaultMessage: 'Display level',
    },
    displayOptionsTitle: {
        id: 'iaso.snt_malaria.compareCustomize.displayOptionsTitle',
        defaultMessage: 'Display options',
    },
    downloadCSVTemplate: {
        id: 'iaso.snt_malaria.scenario.downloadCSVTemplate',
        defaultMessage: 'Download CSV Template',
    },
    duplicate: {
        id: 'iaso.snt_malaria.label.duplicate',
        defaultMessage: 'Duplicate',
    },
    deaths: {
        id: 'iaso.snt_malaria.impact.deaths',
        defaultMessage: 'Deaths',
    },
    edit: {
        defaultMessage: 'Edit',
        id: 'iaso.label.edit',
    },
    editScenarioRule: {
        id: 'iaso.snt_malaria.scenarioRule.edit',
        defaultMessage: 'Edit rule',
    },
    editedOn: {
        id: 'iaso.snt_malaria.label.editedOn',
        defaultMessage: 'Edited on {date}',
    },
    endYear: {
        id: 'iaso.snt_malaria.label.end_year',
        defaultMessage: 'End year',
    },
    endYearMin: {
        id: 'iaso.snt_malaria.scenario.errors.endYearMin',
        defaultMessage:
            'End year must be greater than or equal to start year ({year})',
    },
    entirePeriod: {
        id: 'iaso.snt_malaria.budgeting.entirePeriod',
        defaultMessage: 'Entire period',
    },
    excludedOrgUnits: {
        id: 'iaso.snt_malaria.scenarioRule.excludedOrgUnits',
        defaultMessage: 'Exclude',
    },
    filter: {
        id: 'iaso.snt_malaria.label.filter',
        defaultMessage: 'Filter',
    },
    hideLegend: {
        id: 'iaso.snt_malaria.label.hideLegend',
        defaultMessage: 'Hide Legend',
    },
    hideDetails: {
        id: 'iaso.snt_malaria.label.hideDetails',
        defaultMessage: 'Hide details',
    },
    hideSidebar: {
        id: 'iaso.snt_malaria.label.hideSidebar',
        defaultMessage: 'Hide sidebar',
    },
    impactBudgetLabel: {
        id: 'iaso.snt_malaria.impact.budgetLabel',
        defaultMessage: '2030 Budget: {value}',
    },
    impactCases: {
        id: 'iaso.snt_malaria.impact.cases',
        defaultMessage: 'Cases',
    },
    impactDifferencesTitle: {
        id: 'iaso.snt_malaria.compareCustomize.impactDifferencesTitle',
        defaultMessage: 'Impact differences',
    },
    impactPfprReduction: {
        id: 'iaso.snt_malaria.impact.pfprReduction',
        defaultMessage: 'PfPR reduction',
    },
    impactSettingsLabel: {
        id: 'iaso.snt_malaria.impactSettings.label',
        defaultMessage: 'Impact settings',
    },
    impactSettingsNotIncluded: {
        id: 'iaso.snt_malaria.impactSettings.notIncluded',
        defaultMessage: 'Not included',
    },
    impactSevereCases: {
        id: 'iaso.snt_malaria.impact.severeCases',
        defaultMessage: 'Severe cases',
    },
    impactTargetLabel: {
        id: 'iaso.snt_malaria.impact.targetLabel',
        defaultMessage: '{year} Target: {value}',
    },
    impactTotalCosts: {
        id: 'iaso.snt_malaria.impact.totalCosts',
        defaultMessage: 'Total Cumulative Costs (USD)',
    },
    importCSV: {
        id: 'iaso.snt_malaria.scenario.importCSV',
        defaultMessage: 'Import metric values',
    },
    includedOrgUnits: {
        id: 'iaso.snt_malaria.scenarioRule.includedOrgUnits',
        defaultMessage: 'Include',
    },
    interventionAssignmentRemoveAllButton: {
        id: 'iaso.snt_malaria.interventionAssignment.removeAll',
        defaultMessage: 'Remove all',
    },
    interventionAssignmentRemoveAllMessage: {
        id: 'iaso.snt_malaria.interventionAssignment.removeAllMessage',
        defaultMessage:
            'Do you really want to remove all districts from this intervention assignment?',
    },
    interventionAssignmentRemoveAllTitle: {
        id: 'iaso.snt_malaria.interventionAssignment.removeAllTitle',
        defaultMessage: 'Remove all districts',
    },
    interventionAssignmentRemoveMessage: {
        id: 'iaso.snt_malaria.interventionAssignment.removeMessage',
        defaultMessage:
            'Do you really want to remove this district from this intervention assignment?',
    },
    interventionAssignmentRemoveTitle: {
        id: 'iaso.snt_malaria.interventionAssignment.removeTitle',
        defaultMessage: 'Remove this district',
    },
    interventionLabel: {
        id: 'iaso.snt_malaria.label.interventionLabel',
        defaultMessage: 'Intervention',
    },
    interventionPlanTitle: {
        id: 'iaso.snt_malaria.label.interventionPlanTitle',
        defaultMessage: 'Intervention plan',
    },
    interventionProperties: {
        id: 'iaso.snt_malaria.scenarioRule.interventionProperties',
        defaultMessage: 'Interventions',
    },
    interventionTitle: {
        id: 'iaso.snt_malaria.label.interventionTitle',
        defaultMessage: 'Interventions',
    },
    invertSelection: {
        id: 'iaso.snt_malaria.label.invertSelection',
        defaultMessage: 'Invert Selection',
    },
    layers: {
        id: 'iaso.snt_malaria.label.layers',
        defaultMessage: 'Layers',
    },
    listView: {
        id: 'iaso.snt_malaria.label.listView',
        defaultMessage: 'List',
    },
    loading: {
        id: 'iaso.snt_malaria.loading',
        defaultMessage: 'Loading content...',
    },
    lockScenario: {
        id: 'iaso.snt_malaria.scenario.lockScenario',
        defaultMessage: 'Lock Scenario',
    },
    mapView: {
        id: 'iaso.snt_malaria.label.mapView',
        defaultMessage: 'Map',
    },
    maxYear: {
        id: 'iaso.snt_malaria.scenario.errors.maxYear',
        defaultMessage: 'Year must be at most {year}',
    },
    metricType: {
        id: 'iaso.snt_malaria.scenarioRule.metricType',
        defaultMessage: 'Metric type',
    },
    minYear: {
        id: 'iaso.snt_malaria.scenario.errors.minYear',
        defaultMessage: 'Year must be at least {year}',
    },
    modalDeleteScenarioConfirm: {
        id: 'iaso.snt_malaria.label.delete.confirm',
        defaultMessage: 'Do you really want to delete this scenario?',
    },
    modalDeleteScenarioTitle: {
        id: 'iaso.snt_malaria.label.delete.title',
        defaultMessage: 'Delete Scenario',
    },
    modalLockScenarioConfirm: {
        id: 'iaso.snt_malaria.scenario.modalLockScenarioConfirm',
        defaultMessage:
            'Do you really want to lock this scenario? Locking a scenario will prevent any further edits to be made.',
    },
    modalUnlockScenarioConfirm: {
        id: 'iaso.snt_malaria.scenario.modalUnlockScenarioConfirm',
        defaultMessage:
            'Do you really want to unlock this scenario? Unlocking a scenario allows further edits to be made.',
    },
    more: {
        id: 'iaso.snt_malaria.more',
        defaultMessage: 'More',
    },
    name: {
        id: 'iaso.snt_malaria.label.name',
        defaultMessage: 'Name',
    },
    national: {
        id: 'iaso.snt_malaria.label.national',
        defaultMessage: 'National',
    },
    noBudgetData: {
        id: 'iaso.snt_malaria.compareCustomize.noBudgetData',
        defaultMessage: 'No budget data available',
    },
    noImpactData: {
        id: 'iaso.snt_malaria.compareCustomize.noImpactData',
        defaultMessage: 'No impact data available',
    },
    noLayer: {
        id: 'iaso.snt_malaria.label.noLayer',
        defaultMessage: 'No layer',
    },
    noOrgUnitsSelected: {
        id: 'iaso.snt_malaria.label.noOrgUnitsSelected',
        defaultMessage:
            'No districts adhere to filter rules, no districts were selected',
    },
    noPlanAvailable: {
        id: 'iaso.snt_malaria.label.noInterventionPlanAvailable',
        defaultMessage: 'No intervention plan available',
    },
    none: {
        id: 'iaso.snt_malaria.label.none',
        defaultMessage: 'None',
    },
    'not-seasonal': {
        id: 'iaso.snt_malaria.metrics.not-seasonal',
        defaultMessage: 'Not Seasonal',
    },
    noYearRangeOverlap: {
        id: 'iaso.snt_malaria.compareCustomize.noYearRangeOverlap',
        defaultMessage:
            'No overlapping year range between the selected scenarios and the available impact data. Please select scenarios with compatible year ranges.',
    },
    noYearRangeOverlapTitle: {
        id: 'iaso.snt_malaria.compareCustomize.noYearRangeOverlapTitle',
        defaultMessage: 'No overlapping year range',
    },
    ok: {
        id: 'iaso.snt_malaria.label.ok',
        defaultMessage: 'OK',
    },
    orgUnitsNotFoundTitle: {
        id: 'iaso.snt_malaria.compareCustomize.orgUnitsNotFoundTitle',
        defaultMessage: 'Org units not found',
    },
    orgUnitsNotFound: {
        id: 'iaso.snt_malaria.compareCustomize.orgUnitsNotFound',
        defaultMessage:
            'Some org units could not be found in the impact database.',
    },
    orgUnitsWithUnmatchedInterventionsTitle: {
        id: 'iaso.snt_malaria.compareCustomize.orgUnitsWithUnmatchedInterventionsTitle',
        defaultMessage: 'Unmatched interventions',
    },
    orgUnitsWithUnmatchedInterventions: {
        id: 'iaso.snt_malaria.compareCustomize.orgUnitsWithUnmatchedInterventions',
        defaultMessage:
            'Some org units exist in the impact database but have no data for their assigned interventions.',
    },
    operator: {
        id: 'iaso.snt_malaria.scenarioRule.operator',
        defaultMessage: 'Operator',
    },
    orgUnitDistrict: {
        id: 'iaso.snt_malaria.label.orgUnitDistricts',
        defaultMessage: 'Districts',
    },
    parentOrgUnit: {
        id: 'iaso.snt_malaria.label.parentOrgUnit',
        defaultMessage: 'Parent',
    },
    proportionChart: {
        id: 'iaso.snt_malaria.proportion-chart.title',
        defaultMessage: 'Cost per intervention',
    },
    remove: {
        id: 'iaso.snt_malaria.label.interventionList.remove',
        defaultMessage: 'Remove',
    },
    required: {
        id: 'iaso.snt_malaria.label.required',
        defaultMessage: 'Required',
    },
    requiredField: {
        id: 'iaso.forms.error.fieldRequired',
        defaultMessage: 'This field is required',
    },
    resolveConflictDesc: {
        id: 'iaso.snt_malaria.label.resolveConflictDesc',
        defaultMessage:
            'Some districts already have an intervention from the samegroup.{br} Choose which one to apply, or decide to apply both.',
    },
    resolveConflictTitle: {
        id: 'iaso.snt_malaria.label.resolveConflictTile',
        defaultMessage: 'Resolve Conflicts',
    },
    ruleExceptions: {
        id: 'iaso.snt_malaria.scenarioRule.ruleExceptions',
        defaultMessage: 'Exceptions',
    },
    ruleName: {
        id: 'iaso.snt_malaria.scenarioRule.ruleName',
        defaultMessage: 'Rule name',
    },
    runInterventionPlanBudget: {
        id: 'iaso.snt_malaria.label.runInterventionPlanBudget',
        defaultMessage: 'Run Budget',
    },
    scenarioCSV: {
        id: 'iaso.snt_malaria.scenario.scenarioCSV',
        defaultMessage: 'Scenario CSV',
    },
    scenarioFallbackLabel: {
        id: 'iaso.snt_malaria.compareCustomize.scenarioFallbackLabel',
        defaultMessage: 'Scenario {value}',
    },
    scenarioImportError: {
        id: 'iaso.snt_malaria.scenario.scenarioImportError',
        defaultMessage: 'Error importing scenario',
    },
    scenarioImportSuccess: {
        id: 'iaso.snt_malaria.scenario.scenarioImportSuccess',
        defaultMessage: 'Scenario imported successfully',
    },
    scenarioLabel: {
        id: 'iaso.snt_malaria.label.scenario',
        defaultMessage: 'Scenario',
    },
    scenarioLabelWithIndex: {
        id: 'iaso.snt_malaria.compareCustomize.scenarioLabelWithIndex',
        defaultMessage: 'Scenario {index}',
    },
    scenariosTitle: {
        id: 'iaso.snt_malaria.scenarios.title',
        defaultMessage: 'Scenarios',
    },
    searchPlaceholder: {
        id: 'iaso.snt_malaria.label.searchPlaceholder',
        defaultMessage: 'Search District',
    },
    seasonal: {
        id: 'iaso.snt_malaria.metrics.seasonal',
        defaultMessage: 'Seasonal',
    },
    selectAll: {
        id: 'iaso.snt_malaria.label.selectAll',
        defaultMessage: 'Select All',
    },
    selectDistrictsMessage: {
        id: 'iaso.snt_malaria.label.interventionList.selectDistrictsMessage',
        defaultMessage:
            'Select districts in the map above and add them to the list',
    },
    selectOrgUnitsBtn: {
        id: 'iaso.snt_malaria.label.selectOrgUnitsBtn',
        defaultMessage: 'Select districts',
    },
    selectOrgUnitsSuccess: {
        id: 'iaso.snt_malaria.label.selectOrgUnitsSuccess',
        defaultMessage: 'Selected {amount} districts',
    },
    selectedOrgUnitsCount: {
        id: 'iaso.snt_malaria.label.selectOrgUnitsCount',
        defaultMessage: '{selectionCount} selected',
    },
    selectionCriteria: {
        id: 'iaso.snt_malaria.scenarioRule.selectionCriteria',
        defaultMessage: 'Selection criteria',
    },
    settingsTitle: {
        id: 'iaso.snt_malaria.settings.title',
        defaultMessage: 'Settings',
    },
    showDetails: {
        id: 'iaso.snt_malaria.label.showDetails',
        defaultMessage: 'Show details',
    },
    showLegend: {
        id: 'iaso.snt_malaria.label.showLegend',
        defaultMessage: 'Show Legend',
    },
    showSidebar: {
        id: 'iaso.snt_malaria.label.showSidebar',
        defaultMessage: 'Show sidebar',
    },
    sidebarTitle: {
        id: 'iaso.snt_malaria.label.sidebarTitle',
        defaultMessage: 'Display options',
    },
    startYear: {
        id: 'iaso.snt_malaria.label.start_year',
        defaultMessage: 'Start year',
    },
    submit: {
        id: 'iaso.snt_malaria.label.submit',
        defaultMessage: 'Submit',
    },
    tableNoContent: {
        id: 'iaso.snt_malaria.label.interventionList.tableNoContent',
        defaultMessage: 'Intervention and their districts will appear here.',
    },
    title: {
        id: 'iaso.snt_malaria.home.title',
        defaultMessage: 'SNT Malaria',
    },
    total: {
        id: 'iaso.snt_malaria.budgeting.total',
        defaultMessage: 'Total',
    },
    unlockScenario: {
        id: 'iaso.snt_malaria.scenario.unlockScenario',
        defaultMessage: 'Unlock Scenario',
    },
    unselectAll: {
        id: 'iaso.snt_malaria.label.unselectAll',
        defaultMessage: 'Unselect All',
    },
    value: {
        id: 'iaso.snt_malaria.scenarioRule.value',
        defaultMessage: 'Value',
    },
    warningsTitle: {
        id: 'iaso.snt_malaria.compareCustomize.warningsTitle',
        defaultMessage: 'Warnings',
    },
    yearlyPrevalenceTitle: {
        id: 'iaso.snt_malaria.compareCustomize.yearlyPrevalenceTitle',
        defaultMessage: 'Yearly Prevalence Rate',
    },
    yearsLabel: {
        id: 'iaso.snt_malaria.compareCustomize.yearsLabel',
        defaultMessage: 'Years',
    },
});
