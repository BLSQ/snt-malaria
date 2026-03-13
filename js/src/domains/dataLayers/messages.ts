import { defineMessages } from 'react-intl';

export const MESSAGES = defineMessages({
    importCSV: {
        id: 'iaso.snt_malaria.scenario.importCSV',
        defaultMessage: 'Import metric values',
    },
    genericError: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.genericError',
        defaultMessage: 'Please try again.',
    },
    genericErrorHeadline: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.genericErrorHeadline',
        defaultMessage: 'An unexpected error occurred.',
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
    cancel: {
        defaultMessage: 'Cancel',
        id: 'iaso.label.cancel',
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
    addScaleItem: {
        id: 'iaso.snt_malaria.settings.dataLayers.addScaleItem',
        defaultMessage: 'Add range',
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
    invalidColor: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.invalidColor',
        defaultMessage: 'Invalid color format. Use hex code like #A1B2C3.',
    },
});
