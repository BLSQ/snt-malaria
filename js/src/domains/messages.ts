import { defineMessages } from 'react-intl';

export const MESSAGES = defineMessages({
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
        defaultMessage: 'Cost Breakdown by Category per Intervention',
    },
    proportionChart: {
        id: 'iaso.snt_malaria.proportion-chart.title',
        defaultMessage: 'Proportion ot Total Budget by Intervention',
    },
    selectYear: {
        id: 'iaso.snt_malaria.budgeting.selectYear',
        defaultMessage: 'Select a year',
    },
    entirePeriod: {
        id: 'iaso.snt_malaria.budgeting.entirePeriod',
        defaultMessage: 'Entire period',
    },
});
