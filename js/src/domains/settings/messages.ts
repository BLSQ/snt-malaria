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
        id: 'iaso.snt_malaria.label.required',
        defaultMessage: 'Required',
    },
    noWhitespace: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.noWhitespace',
        defaultMessage: 'Whitespace not allowed',
    },
    invalidJsonArray: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.invalidJsonArray',
        defaultMessage: 'Invalid format, must be [value1, value2, ...]',
    },
    maxLength: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.maxLength',
        defaultMessage: 'Value must be at most {max} characters long',
    },
    scaleItemsCount: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.scaleItemsCount',
        defaultMessage:
            'Invalid number of scale items for the selected legend type',
    },
    uniqueCodeErrorHeadline: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.uniqueCodeErrorHeadline',
        defaultMessage: 'Layer with this code already exists.',
    },
    uniqueCodeError: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.uniqueCodeError',
        defaultMessage:
            'A Layer with this code already exists. Please choose a different code.',
    },
    codeImmutableErrorHeadline: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.codeImmutableHeadline',
        defaultMessage: 'Layer code is immutable.',
    },
    codeImmutableError: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.codeImmutable',
        defaultMessage: 'The code of a Layer cannot be changed.',
    },
    genericErrorHeadline: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.genericErrorHeadline',
        defaultMessage: 'An unexpected error occurred.',
    },
    genericError: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.genericError',
        defaultMessage: 'Please try again.',
    },
    downloadCSVTemplate: {
        id: 'iaso.snt_malaria.settings.dataLayers.downloadCSVTemplate',
        defaultMessage: 'Download CSV Template',
    },
    importCSV: {
        id: 'iaso.snt_malaria.settings.dataLayers.importCSV',
        defaultMessage: 'Import CSV',
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
    editLayer: {
        id: 'iaso.snt_malaria.settings.dataLayers.editLayer',
        defaultMessage: 'Edit Layer',
    },
    deleteLayer: {
        id: 'iaso.snt_malaria.settings.dataLayers.deleteLayer',
        defaultMessage: 'Delete Layer',
    },
    searchByName: {
        id: 'iaso.snt_malaria.settings.dataLayers.searchByName',
        defaultMessage: 'Search by name',
    },
    noLayersFound: {
        id: 'iaso.snt_malaria.settings.dataLayers.noLayersFound',
        defaultMessage: 'No layers found.',
    },
    variable: {
        id: 'iaso.snt_malaria.settings.dataLayers.variable',
        defaultMessage: 'Variable',
    },
    label: {
        id: 'iaso.snt_malaria.settings.dataLayers.label',
        defaultMessage: 'Label',
    },
    category: {
        id: 'iaso.snt_malaria.settings.dataLayers.category',
        defaultMessage: 'Category',
    },
    description: {
        id: 'iaso.snt_malaria.label.description',
        defaultMessage: 'Description',
    },
    units: {
        id: 'iaso.snt_malaria.settings.dataLayers.units',
        defaultMessage: 'Units',
    },
    unitSymbol: {
        id: 'iaso.snt_malaria.settings.dataLayers.unitSymbol',
        defaultMessage: 'Unit Symbol',
    },
    scale: {
        id: 'iaso.snt_malaria.settings.dataLayers.scale',
        defaultMessage: 'Scale',
    },
    legendType: {
        id: 'iaso.snt_malaria.settings.dataLayers.legendType',
        defaultMessage: 'Legend Type',
    },
    deleteLayerConfirmMessage: {
        id: 'iaso.snt_malaria.settings.dataLayers.deleteLayerConfirmMessage',
        defaultMessage: 'Are you sure you want to delete this layer?',
    },
    metricValuesImportSuccess: {
        id: 'iaso.snt_malaria.settings.dataLayers.metricValuesImportSuccess',
        defaultMessage: 'Metric values imported successfully.',
    },
    metricValuesImportError: {
        id: 'iaso.snt_malaria.settings.dataLayers.metricValuesImportError',
        defaultMessage: 'Error importing metric values. Please try again.',
    },
});
