import { defineMessages } from 'react-intl';

export const MESSAGES = defineMessages({
    create: {
        defaultMessage: 'Create',
        id: 'iaso.label.create',
    },
    edit: {
        defaultMessage: 'Edit',
        id: 'iaso.label.edit',
    },
    requiredField: {
        id: 'iaso.forms.error.fieldRequired',
        defaultMessage: 'This field is required',
    },
    required: {
        id: 'iaso.snt_malaria.label.required',
        defaultMessage: 'Required',
    },
    maxYear: {
        id: 'iaso.snt_malaria.scenario.errors.maxYear',
        defaultMessage: 'Year must be at most {year}',
    },
    minYear: {
        id: 'iaso.snt_malaria.scenario.errors.minYear',
        defaultMessage: 'Year must be at least {year}',
    },
    endYearMin: {
        id: 'iaso.snt_malaria.scenario.errors.endYearMin',
        defaultMessage:
            'End year must be greater than or equal to start year ({year})',
    },
    title: {
        id: 'iaso.snt_malaria.home.title',
        defaultMessage: 'SNT Malaria',
    },
    settingsTitle: {
        id: 'iaso.snt_malaria.settings.title',
        defaultMessage: 'Settings',
    },
    name: {
        id: 'iaso.snt_malaria.label.name',
        defaultMessage: 'Name',
    },
    description: {
        id: 'iaso.snt_malaria.label.description',
        defaultMessage: 'Description',
    },
    startYear: {
        id: 'iaso.snt_malaria.label.start_year',
        defaultMessage: 'Start year',
    },
    endYear: {
        id: 'iaso.snt_malaria.label.end_year',
        defaultMessage: 'End year',
    },
    layers: {
        id: 'iaso.snt_malaria.label.layers',
        defaultMessage: 'Layers',
    },
    above: {
        id: 'iaso.snt_malaria.label.layers.above',
        defaultMessage: 'Above',
    },
    editedOn: {
        id: 'iaso.snt_malaria.label.editedOn',
        defaultMessage: 'Edited on {date}',
    },
    interventionTitle: {
        id: 'iaso.snt_malaria.label.interventionTitle',
        defaultMessage: 'Interventions',
    },
    interventionLabel: {
        id: 'iaso.snt_malaria.label.interventionLabel',
        defaultMessage: 'Intervention',
    },
    orgUnitDistrict: {
        id: 'iaso.snt_malaria.label.orgUnitDistricts',
        defaultMessage: 'Districts',
    },
    addToPlan: {
        id: 'iaso.snt_malaria.label.interventionList.addToPlan',
        defaultMessage: 'Add to plan',
    },
    cancel: {
        defaultMessage: 'Cancel',
        id: 'iaso.label.cancel',
    },
    duplicate: {
        id: 'iaso.snt_malaria.label.duplicate',
        defaultMessage: 'Duplicate',
    },
    remove: {
        id: 'iaso.snt_malaria.label.interventionList.remove',
        defaultMessage: 'Remove',
    },
    add: {
        id: 'iaso.snt_malaria.label.interventionList.add',
        defaultMessage: 'Add',
    },
    interventionPlanTitle: {
        id: 'iaso.snt_malaria.label.interventionPlanTitle',
        defaultMessage: 'Intervention plan',
    },
    noPlanAvailable: {
        id: 'iaso.snt_malaria.label.noInterventionPlanAvailable',
        defaultMessage: 'No intervention plan available',
    },
    none: {
        id: 'iaso.snt_malaria.label.none',
        defaultMessage: 'None',
    },
    ok: {
        id: 'iaso.snt_malaria.label.ok',
        defaultMessage: 'OK',
    },
    changeTo: {
        id: 'iaso.snt_malaria.label.changeTo',
        defaultMessage: 'Change to...',
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
    selectOrgUnitsBtn: {
        id: 'iaso.snt_malaria.label.selectOrgUnitsBtn',
        defaultMessage: 'Select districts',
    },
    selectOrgUnitsSuccess: {
        id: 'iaso.snt_malaria.label.selectOrgUnitsSuccess',
        defaultMessage: 'Selected {amount} districts',
    },
    noOrgUnitsSelected: {
        id: 'iaso.snt_malaria.label.noOrgUnitsSelected',
        defaultMessage:
            'No districts adhere to filter rules, no districts were selected',
    },
    clearOrgUnitSelection: {
        id: 'iaso.snt_malaria.label.clearOrgUnitSelection',
        defaultMessage: 'Clear selection',
    },
    selectDistrictsMessage: {
        id: 'iaso.snt_malaria.label.interventionList.selectDistrictsMessage',
        defaultMessage:
            'Select districts in the map above and add them to the list',
    },
    addMap: {
        id: 'iaso.snt_malaria.label.addMap',
        defaultMessage: 'Add a covariant map',
    },
    tableNoContent: {
        id: 'iaso.snt_malaria.label.interventionList.tableNoContent',
        defaultMessage: 'Intervention and their districts will appear here.',
    },
    selectedOrgUnitsCount: {
        id: 'iaso.snt_malaria.label.selectOrgUnitsCount',
        defaultMessage: '{selectionCount} selected',
    },
    clearSelectionTooltip: {
        id: 'iaso.snt_malaria.label.clearSelectionTooltip',
        defaultMessage: 'Clear selection',
    },
    clearedMapSelection: {
        id: 'iaso.snt_malaria.label.clearedMapSelection',
        defaultMessage: 'Map selection has been cleared',
    },
    showLegend: {
        id: 'iaso.snt_malaria.label.showLegend',
        defaultMessage: 'Show Legend',
    },
    hideLegend: {
        id: 'iaso.snt_malaria.label.hideLegend',
        defaultMessage: 'Hide Legend',
    },
    modalDeleteScenarioTitle: {
        id: 'iaso.snt_malaria.label.delete.title',
        defaultMessage: 'Delete Scenario',
    },
    modalDeleteScenarioConfirm: {
        id: 'iaso.snt_malaria.label.delete.confirm',
        defaultMessage: 'Do you really want to delete this scenario?',
    },
    interventionAssignmentRemoveAllButton: {
        id: 'iaso.snt_malaria.interventionAssignment.removeAll',
        defaultMessage: 'Remove all',
    },
    interventionAssignmentRemoveAllTitle: {
        id: 'iaso.snt_malaria.interventionAssignment.removeAllTitle',
        defaultMessage: 'Remove all districts',
    },
    interventionAssignmentRemoveAllMessage: {
        id: 'iaso.snt_malaria.interventionAssignment.removeAllMessage',
        defaultMessage:
            'Do you really want to remove all districts from this intervention assignment?',
    },
    interventionAssignmentRemoveTitle: {
        id: 'iaso.snt_malaria.interventionAssignment.removeTitle',
        defaultMessage: 'Remove this district',
    },
    interventionAssignmentRemoveMessage: {
        id: 'iaso.snt_malaria.interventionAssignment.removeMessage',
        defaultMessage:
            'Do you really want to remove this district from this intervention assignment?',
    },
    searchPlaceholder: {
        id: 'iaso.snt_malaria.label.searchPlaceholder',
        defaultMessage: 'Search District',
    },
    allInterventionCategories: {
        id: 'iaso.snt_malaria.label.allInterventionCategories',
        defaultMessage: 'All intervention categories',
    },
    allInterventions: {
        id: 'iaso.snt_malaria.label.allInterventions',
        defaultMessage: 'All interventions',
    },
    resolveConflictTitle: {
        id: 'iaso.snt_malaria.label.resolveConflictTile',
        defaultMessage: 'Resolve Conflicts',
    },
    apply: {
        id: 'iaso.snt_malaria.label.apply',
        defaultMessage: 'Apply',
    },
    resolveConflictDesc: {
        id: 'iaso.snt_malaria.label.resolveConflictDesc',
        defaultMessage:
            'Some districts already have an intervention from the samegroup.{br} Choose which one to apply, or decide to apply both.',
    },
    runInterventionPlanBudget: {
        id: 'iaso.snt_malaria.label.runInterventionPlanBudget',
        defaultMessage: 'Run Budget',
    },
    selectAll: {
        id: 'iaso.snt_malaria.label.selectAll',
        defaultMessage: 'Select All',
    },
    unselectAll: {
        id: 'iaso.snt_malaria.label.unselectAll',
        defaultMessage: 'Unselect All',
    },
    invertSelection: {
        id: 'iaso.snt_malaria.label.invertSelection',
        defaultMessage: 'Invert Selection',
    },
    filter: {
        id: 'iaso.snt_malaria.label.filter',
        defaultMessage: 'Filter',
    },
    seasonal: {
        id: 'iaso.snt_malaria.metrics.seasonal',
        defaultMessage: 'Seasonal',
    },
    'not-seasonal': {
        id: 'iaso.snt_malaria.metrics.not-seasonal',
        defaultMessage: 'Not Seasonal',
    },
    costBreakdownChartTitle: {
        id: 'iaso.snt_malaria.cost-breakdown-chart.title',
        defaultMessage: 'Cost per intervention category',
    },
    proportionChart: {
        id: 'iaso.snt_malaria.proportion-chart.title',
        defaultMessage: 'Cost per intervention',
    },
    budget: {
        id: 'iaso.snt_malaria.budgeting.budget',
        defaultMessage: 'Budget',
    },
    total: {
        id: 'iaso.snt_malaria.budgeting.total',
        defaultMessage: 'Total',
    },
    entirePeriod: {
        id: 'iaso.snt_malaria.budgeting.entirePeriod',
        defaultMessage: 'Entire period',
    },
    more: {
        id: 'iaso.snt_malaria.more',
        defaultMessage: 'More',
    },
    loading: {
        id: 'iaso.snt_malaria.loading',
        defaultMessage: 'Loading content...',
    },
    downloadCSVTemplate: {
        id: 'iaso.snt_malaria.scenario.downloadCSVTemplate',
        defaultMessage: 'Download CSV Template',
    },
    importCSV: {
        id: 'iaso.snt_malaria.scenario.importCSV',
        defaultMessage: 'Import metric values',
    },
    createScenario: {
        id: 'iaso.snt_malaria.scenario.createScenario',
        defaultMessage: 'Create Scenario',
    },
    scenarioCSV: {
        id: 'iaso.snt_malaria.scenario.scenarioCSV',
        defaultMessage: 'Scenario CSV',
    },
    scenarioImportSuccess: {
        id: 'iaso.snt_malaria.scenario.scenarioImportSuccess',
        defaultMessage: 'Scenario imported successfully',
    },
    scenarioImportError: {
        id: 'iaso.snt_malaria.scenario.scenarioImportError',
        defaultMessage: 'Error importing scenario',
    },
    lockScenario: {
        id: 'iaso.snt_malaria.scenario.lockScenario',
        defaultMessage: 'Lock Scenario',
    },
    unlockScenario: {
        id: 'iaso.snt_malaria.scenario.unlockScenario',
        defaultMessage: 'Unlock Scenario',
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
    budgetAssumptionsLabel: {
        id: 'iaso.snt_malaria.budgetAssumptions.label',
        defaultMessage: 'Budget settings',
    },
    budgetAssumptionsSave: {
        id: 'iaso.snt_malaria.budgetAssumptions.save',
        defaultMessage: 'Save Settings',
    },
    budgetAssumptionsCoverage: {
        id: 'iaso.snt_malaria.budgetAssumptions.coverage',
        defaultMessage: 'Coverage',
    },
    budgetAssumptionsBuffer: {
        id: 'iaso.snt_malaria.budgetAssumptions.buffer',
        defaultMessage: 'Buffer',
    },
    budgetAssumptionsPPN: {
        id: 'iaso.snt_malaria.budgetAssumptions.ppn',
        defaultMessage: 'PPN',
    },
    budgetAssumptionsTouchpoints: {
        id: 'iaso.snt_malaria.budgetAssumptions.touchpoints',
        defaultMessage: 'Tp.',
    },
    budgetAssumptionsPopProp3_11: {
        id: 'iaso.snt_malaria.budgetAssumptions.pop_prop_3_11',
        defaultMessage: '3-11mo',
    },
    budgetAssumptionsPopProp12_59: {
        id: 'iaso.snt_malaria.budgetAssumptions.pop_prop_12_59',
        defaultMessage: '12-59mo',
    },
    budgetAssumptionsMonthlyRound: {
        id: 'iaso.snt_malaria.budgetAssumptions.monthly_round',
        defaultMessage: 'Cycles',
    },
    budgetAssumptionsBaleSize: {
        id: 'iaso.snt_malaria.budgetAssumptions.bale_size',
        defaultMessage: 'Bale Sz.',
    },
    budgetAssumptionsDosesPerPW: {
        id: 'iaso.snt_malaria.budgetAssumptions.doses_per_pw',
        defaultMessage: 'PW Doses',
    },
    budgetAssumptionsDosesPerChild: {
        id: 'iaso.snt_malaria.budgetAssumptions.doses_per_child',
        defaultMessage: 'Child Doses',
    },
    budgetAssumptionsTabletFactor: {
        id: 'iaso.snt_malaria.budgetAssumptions.tablet_factor',
        defaultMessage: 'Tablet Fac.',
    },
    impactSettingsLabel: {
        id: 'iaso.snt_malaria.impactSettings.label',
        defaultMessage: 'Impact settings',
    },
    impactSettingsNotIncluded: {
        id: 'iaso.snt_malaria.impactSettings.notIncluded',
        defaultMessage: 'Not included',
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
    budgetAssumptionsDescription_vacc: {
        id: 'iaso.snt_malaria.budgetAssumptions.description.vacc',
        defaultMessage: `To estimate the number of malaria vaccine doses required, at default,
        we assume each eligible child will receive a <b>4-dose schedule</b>.
        Assuming the first three doses are delivered monthly and start around 5 months of age and the 4th dose is delivered ~12 - 15 months following the 3rd dose.
        The vaccine is delivered through routine immunization contacts with an <b>expected coverage of 84%</b> among the target population.
        A 10% buffer is included to account for losses during transportation, storage, and administration.`,
    },
    budgetAssumptionsPath: {
        id: 'iaso.snt_malaria.budgetAssumptions.path',
        defaultMessage:
            'Budgeting methodology based on tools and documentation developed by PATH.',
    },
    budgetAssumptionsMinValue: {
        id: 'iaso.snt_malaria.budgetAssumptions.minValue',
        defaultMessage: 'Value must be at least {min}',
    },
    budgetAssumptionsMaxValue: {
        id: 'iaso.snt_malaria.budgetAssumptions.maxValue',
        defaultMessage: 'Value must be at most {max}',
    },
    applyScenarioRule: {
        id: 'iaso.snt_malaria.scenarioRule.apply',
        defaultMessage: 'Apply rules',
    },
    createScenarioRule: {
        id: 'iaso.snt_malaria.scenarioRule.create',
        defaultMessage: 'Create rule',
    },
    editScenarioRule: {
        id: 'iaso.snt_malaria.scenarioRule.edit',
        defaultMessage: 'Edit rule',
    },
    deleteScenarioRule: {
        id: 'iaso.snt_malaria.scenarioRule.delete',
        defaultMessage: 'Delete rule',
    },
    deleteScenarioRuleSuccess: {
        id: 'iaso.snt_malaria.scenarioRule.deleteSuccess',
        defaultMessage: 'Scenario rule deleted successfully',
    },
    deleteScenarioRuleError: {
        id: 'iaso.snt_malaria.scenarioRule.deleteError',
        defaultMessage: 'Error deleting scenario rule',
    },
    deleteScenarioRuleConfirmMessage: {
        id: 'iaso.snt_malaria.scenarioRule.deleteConfirmMessage',
        defaultMessage: 'Do you really want to delete this scenario rule?',
    },
    addInterventionProperty: {
        id: 'iaso.snt_malaria.scenarioRule.addInterventionProperty',
        defaultMessage: 'Add intervention',
    },
    addMatchingCriteria: {
        id: 'iaso.snt_malaria.scenarioRule.addMatchingCriteria',
        defaultMessage: 'Add Criteria',
    },
    ruleName: {
        id: 'iaso.snt_malaria.scenarioRule.ruleName',
        defaultMessage: 'Rule name',
    },
    metricType: {
        id: 'iaso.snt_malaria.scenarioRule.metricType',
        defaultMessage: 'Metric type',
    },
    operator: {
        id: 'iaso.snt_malaria.scenarioRule.operator',
        defaultMessage: 'Operator',
    },
    value: {
        id: 'iaso.snt_malaria.scenarioRule.value',
        defaultMessage: 'Value',
    },
    selectionCriteria: {
        id: 'iaso.snt_malaria.scenarioRule.selectionCriteria',
        defaultMessage: 'Selection criteria',
    },
    interventionProperties: {
        id: 'iaso.snt_malaria.scenarioRule.interventionProperties',
        defaultMessage: 'Interventions',
    },
    showSidebar: {
        id: 'iaso.snt_malaria.label.showSidebar',
        defaultMessage: 'Show sidebar',
    },
    hideSidebar: {
        id: 'iaso.snt_malaria.label.hideSidebar',
        defaultMessage: 'Hide sidebar',
    },
    sidebarTitle: {
        id: 'iaso.snt_malaria.label.sidebarTitle',
        defaultMessage: 'Display options',
    },
    parentOrgUnit: {
        id: 'iaso.snt_malaria.label.parentOrgUnit',
        defaultMessage: 'Parent',
    },
    allParentOrgUnits: {
        id: 'iaso.snt_malaria.label.allParentOrgUnits',
        defaultMessage: 'All',
    },
    displayLevel: {
        id: 'iaso.snt_malaria.label.displayLevel',
        defaultMessage: 'Display level',
    },
    allDisplayLevels: {
        id: 'iaso.snt_malaria.label.allDisplayLevels',
        defaultMessage: 'All',
    },
    allOrgUnits: {
        id: 'iaso.snt_malaria.label.allOrgUnits',
        defaultMessage: 'All',
    },
});
