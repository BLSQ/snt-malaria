import { defineMessages } from 'react-intl';

export const MESSAGES = defineMessages({
    create: {
        defaultMessage: 'Create',
        id: 'iaso.label.create',
    },
    cancel: {
        defaultMessage: 'Cancel',
        id: 'iaso.label.cancel',
    },
    title: {
        id: 'iaso.snt_malaria.settings.title',
        defaultMessage: 'Settings',
    },
    interventionsTitle: {
        id: 'iaso.snt_malaria.settings.intervention.title',
        defaultMessage: 'Interventions',
    },
    interventionsSubtitle: {
        id: 'iaso.snt_malaria.settings.intervention.subtitle',
        defaultMessage: 'Customize and group interventions',
    },
    editCost: {
        id: 'iaso.snt_malaria.settings.intervention.editCost',
        defaultMessage: 'Edit cost',
    },
    unit: {
        id: 'iaso.snt_malaria.settings.intervention.unit',
        defaultMessage: 'Unit',
    },
    costPerUnit: {
        id: 'iaso.snt_malaria.settings.intervention.costPerUnit',
        defaultMessage: 'Cost per unit',
    },
    save: {
        id: 'iaso.snt_malaria.settings.intervention.save',
        defaultMessage: 'Save intervention',
    },
    removeInterventionCostBreakdownLine: {
        id: 'iaso.snt_malaria.settings.intervention.removeInterventionCostBreakdownLine',
        defaultMessage: 'Remove cost',
    },
    addInterventionCostBreakdownLine: {
        id: 'iaso.snt_malaria.settings.intervention.addInterventionCostBreakdownLine',
        defaultMessage: 'Add cost',
    },
    detailedCosts: {
        id: 'iaso.snt_malaria.settings.intervention.detailedCosts',
        defaultMessage: 'Detailed costs',
    },
    detailedCostLabel: {
        id: 'iaso.snt_malaria.settings.intervention.detailedCostLabel',
        defaultMessage: 'Item',
    },
    detailedCostUnitLabel: {
        id: 'iaso.snt_malaria.settings.intervention.detailedCostUnitLabel',
        defaultMessage: 'Cost Unit',
    },
    detailedCostCategoryLabel: {
        id: 'iaso.snt_malaria.settings.intervention.detailedCostCategoryLabel',
        defaultMessage: 'Category',
    },
    required: {
        id: 'iaso.snt_malaria.settings.intervention.errors.required',
        defaultMessage: 'Required',
    },
    invalidJsonArray: {
        id: 'iaso.snt_malaria.settings.intervention.errors.invalidJsonArray',
        defaultMessage: 'Invalid format, must be [value1, value2, ...]',
    },
    uniqueCodeErrorHeadline: {
        id: 'iaso.snt_malaria.settings.metricTypes.errors.uniqueCodeErrorHeadline',
        defaultMessage: 'MetricType with this code already exists.',
    },
    uniqueCodeError: {
        id: 'iaso.snt_malaria.settings.metricTypes.errors.uniqueCodeError',
        defaultMessage:
            'A Metric Type with this code already exists. Please choose a different code.',
    },
    codeImmutableErrorHeadline: {
        id: 'iaso.snt_malaria.settings.metricTypes.errors.codeImmutableHeadline',
        defaultMessage: 'MetricType code is immutable.',
    },
    codeImmutableError: {
        id: 'iaso.snt_malaria.settings.metricTypes.errors.codeImmutable',
        defaultMessage: 'The code of a Metric Type cannot be changed.',
    },
    genericErrorHeadline: {
        id: 'iaso.snt_malaria.settings.metricTypes.errors.genericErrorHeadline',
        defaultMessage: 'An unexpected error occurred.',
    },
    genericError: {
        id: 'iaso.snt_malaria.settings.metricTypes.errors.genericError',
        defaultMessage: 'Please try again.',
    },
    negativeValueNotAllowed: {
        id: 'iaso.snt_malaria.settings.intervention.errors.negativeValueNotAllowed',
        defaultMessage: 'Negative value not allowed',
    },
    selectYear: {
        id: 'iaso.snt_malaria.settings.intervention.selectYear',
        defaultMessage: 'Select Year',
    },
    noCostBreakdownLines: {
        id: 'iaso.snt_malaria.settings.intervention.noCostBreakdownLines',
        defaultMessage: 'No cost configured.',
    },
    dataLayersTitle: {
        id: 'iaso.snt_malaria.settings.dataLayers.title',
        defaultMessage: 'Data Layers',
    },
    dataLayersSubtitle: {
        id: 'iaso.snt_malaria.settings.dataLayers.subtitle',
        defaultMessage:
            'Manage the covariate maps available when creating an intervention plan.',
    },
    more: {
        id: 'iaso.snt_malaria.more',
        defaultMessage: 'More',
    },
    createLayer: {
        id: 'iaso.snt_malaria.settings.dataLayers.createLayer',
        defaultMessage: 'Create layer',
    },
    searchByName: {
        id: 'iaso.snt_malaria.settings.dataLayers.searchByName',
        defaultMessage: 'Search by name',
    },
    noMetricTypesFound: {
        id: 'iaso.snt_malaria.settings.metricTypes.noMetricTypesFound',
        defaultMessage: 'No metric types found.',
    },
    variable: {
        id: 'iaso.snt_malaria.settings.metricTypes.variable',
        defaultMessage: 'Variable',
    },
    label: {
        id: 'iaso.snt_malaria.settings.metricTypes.label',
        defaultMessage: 'Label',
    },
    category: {
        id: 'iaso.snt_malaria.settings.metricTypes.category',
        defaultMessage: 'Category',
    },
    description: {
        id: 'iaso.snt_malaria.settings.metricTypes.description',
        defaultMessage: 'Description',
    },
    units: {
        id: 'iaso.snt_malaria.settings.metricTypes.units',
        defaultMessage: 'Units',
    },
    unitSymbol: {
        id: 'iaso.snt_malaria.settings.metricTypes.unitSymbol',
        defaultMessage: 'Unit Symbol',
    },
    scale: {
        id: 'iaso.snt_malaria.settings.metricTypes.scale',
        defaultMessage: 'Scale',
    },
    legendType: {
        id: 'iaso.snt_malaria.settings.metricTypes.legendType',
        defaultMessage: 'Legend Type',
    },
    createMetricType: {
        id: 'iaso.snt_malaria.settings.metricTypes.createMetricType',
        defaultMessage: 'Create Layer',
    },
    editMetricType: {
        id: 'iaso.snt_malaria.settings.metricTypes.editMetricType',
        defaultMessage: 'Edit Layer',
    },
    deleteMetricType: {
        id: 'iaso.snt_malaria.settings.metricTypes.deleteMetricType',
        defaultMessage: 'Delete Layer',
    },
});
