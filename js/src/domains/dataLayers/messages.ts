import { defineMessages } from 'react-intl';

export const MESSAGES = defineMessages({
    cancel: {
        defaultMessage: 'Cancel',
        id: 'iaso.label.cancel',
    },
    description: {
        id: 'iaso.snt_malaria.label.description',
        defaultMessage: 'Description',
    },
    more: {
        id: 'iaso.snt_malaria.more',
        defaultMessage: 'More',
    },
    importCSV: {
        id: 'iaso.snt_malaria.scenario.importCSV',
        defaultMessage: 'Import metric values',
    },
    addScaleItem: {
        id: 'iaso.snt_malaria.settings.dataLayers.addScaleItem',
        defaultMessage: 'Add range',
    },
    category: {
        id: 'iaso.snt_malaria.settings.dataLayers.category',
        defaultMessage: 'Category',
    },
    createLayer: {
        id: 'iaso.snt_malaria.settings.dataLayers.createLayer',
        defaultMessage: 'Create layer',
    },
    deleteLayer: {
        id: 'iaso.snt_malaria.settings.dataLayers.deleteLayer',
        defaultMessage: 'Delete Layer',
    },
    deleteLayerConfirmMessage: {
        id: 'iaso.snt_malaria.settings.dataLayers.deleteLayerConfirmMessage',
        defaultMessage: 'Are you sure you want to delete this layer?',
    },
    downloadCSVTemplate: {
        id: 'iaso.snt_malaria.settings.dataLayers.downloadCSVTemplate',
        defaultMessage: 'Download CSV Template',
    },
    editLayer: {
        id: 'iaso.snt_malaria.settings.dataLayers.editLayer',
        defaultMessage: 'Edit Layer',
    },
    codeImmutableErrorHeadline: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.codeImmutableHeadline',
        defaultMessage: 'Layer code is immutable.',
    },
    genericError: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.genericError',
        defaultMessage: 'Please try again.',
    },
    genericErrorHeadline: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.genericErrorHeadline',
        defaultMessage: 'An unexpected error occurred.',
    },
    invalidColor: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.invalidColor',
        defaultMessage: 'Invalid color format. Use hex code like #A1B2C3.',
    },
    maxLength: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.maxLength',
        defaultMessage: 'Must be at most {max} characters',
    },
    noWhitespace: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.noWhitespace',
        defaultMessage: 'Must not contain whitespace',
    },
    uniqueCodeError: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.uniqueCodeError',
        defaultMessage:
            'A Layer with this code already exists. Please choose a different code.',
    },
    uniqueCodeErrorHeadline: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.uniqueCodeErrorHeadline',
        defaultMessage: 'Layer with this code already exists.',
    },
    label: {
        id: 'iaso.snt_malaria.settings.dataLayers.label',
        defaultMessage: 'Label',
    },
    legendType: {
        id: 'iaso.snt_malaria.settings.dataLayers.legendType',
        defaultMessage: 'Legend Type',
    },
    metricValuesImportError: {
        id: 'iaso.snt_malaria.settings.dataLayers.metricValuesImportError',
        defaultMessage: 'Error importing metric values. Please try again.',
    },
    metricValuesImportSuccess: {
        id: 'iaso.snt_malaria.settings.dataLayers.metricValuesImportSuccess',
        defaultMessage: 'Metric values imported successfully.',
    },
    noLayersFound: {
        id: 'iaso.snt_malaria.settings.dataLayers.noLayersFound',
        defaultMessage: 'No layers found.',
    },
    required: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.required',
        defaultMessage: 'This field is required',
    },
    scale: {
        id: 'iaso.snt_malaria.settings.dataLayers.scale',
        defaultMessage: 'Scale',
    },
    scaleItemsCount: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.scaleItemsCount',
        defaultMessage: 'Invalid number of scale items',
    },
    scaleItemsUnique: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.scaleItemsUnique',
        defaultMessage: 'Scale values must be unique',
    },
    searchByName: {
        id: 'iaso.snt_malaria.settings.dataLayers.searchByName',
        defaultMessage: 'Search by name',
    },
    dataLayersSubtitle: {
        id: 'iaso.snt_malaria.settings.dataLayers.subtitle',
        defaultMessage:
            'Manage the covariate maps available when creating an intervention plan.',
    },
    dataLayersTitle: {
        id: 'iaso.snt_malaria.settings.dataLayers.title',
        defaultMessage: 'Data Layers',
    },
    unitSymbol: {
        id: 'iaso.snt_malaria.settings.dataLayers.unitSymbol',
        defaultMessage: 'Unit Symbol',
    },
    units: {
        id: 'iaso.snt_malaria.settings.dataLayers.units',
        defaultMessage: 'Units',
    },
    variable: {
        id: 'iaso.snt_malaria.settings.dataLayers.variable',
        defaultMessage: 'Variable',
    },
});
