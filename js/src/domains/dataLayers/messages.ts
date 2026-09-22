import { defineMessages } from 'react-intl';

export const MESSAGES = defineMessages({
    cancel: {
        defaultMessage: 'Cancel',
        id: 'iaso.label.cancel',
    },
    confirm: {
        defaultMessage: 'Confirm',
        id: 'iaso.label.confirm',
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
        defaultMessage: 'Import CSV',
    },
    exportCSV: {
        id: 'iaso.snt_malaria.settings.dataLayers.exportCSV',
        defaultMessage: 'Export to CSV',
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
    layerTypeData: {
        id: 'iaso.snt_malaria.settings.dataLayers.layerTypeData',
        defaultMessage: 'Standard data layer',
    },
    layerTypeDataInfo: {
        id: 'iaso.snt_malaria.settings.dataLayers.layerTypeDataInfo',
        defaultMessage:
            "A layer whose data is imported from a CSV file or OpenHEXA. The data key needs to match the source data's.",
    },
    layerTypeCompositeInfo: {
        id: 'iaso.snt_malaria.settings.dataLayers.layerTypeCompositeInfo',
        defaultMessage:
            'A layer composed of other layers. Combine any number of input layers using operations and transformations.',
    },
    layerTypeOpenHexa: {
        id: 'iaso.snt_malaria.settings.dataLayers.layerTypeOpenHexa',
        defaultMessage: 'OpenHexa data layer',
    },
    layerTypeOpenHexaInfo: {
        id: 'iaso.snt_malaria.settings.dataLayers.layerTypeOpenHexaInfo',
        defaultMessage:
            'A layer defined in your OpenHexa configuration. Its metadata and default legend are filled in from OpenHexa.',
    },
    openHexaDataLayer: {
        id: 'iaso.snt_malaria.settings.dataLayers.openHexaDataLayer',
        defaultMessage: 'Data layer',
    },
    openHexaDataLayerHelp: {
        id: 'iaso.snt_malaria.settings.dataLayers.openHexaDataLayerHelp',
        defaultMessage:
            'Metadata and default legend come from this data layer.',
    },
    openHexaFieldsReadOnly: {
        id: 'iaso.snt_malaria.settings.dataLayers.openHexaFieldsReadOnly',
        defaultMessage: 'Filled in from OpenHexa — read-only.',
    },
    openHexaDataLayersError: {
        id: 'iaso.snt_malaria.settings.dataLayers.openHexaDataLayersError',
        defaultMessage: 'Could not load data layers from OpenHexa.',
    },
    openHexaLayersUnimportable: {
        id: 'iaso.snt_malaria.settings.dataLayers.openHexaLayersUnimportable',
        defaultMessage:
            'Some OpenHexa data layers cannot be imported and are hidden from the list:',
    },
    openHexaLayersAlreadyImported: {
        id: 'iaso.snt_malaria.settings.dataLayers.openHexaLayersAlreadyImported',
        defaultMessage: 'Already imported (hidden): {layers}',
    },
    openHexaImportStarted: {
        id: 'iaso.snt_malaria.settings.dataLayers.openHexaImportStarted',
        defaultMessage:
            'Import started. The layer values will appear once the task completes.',
    },
    refreshFromOpenHexa: {
        id: 'iaso.snt_malaria.settings.dataLayers.refreshFromOpenHexa',
        defaultMessage: 'Refresh from OpenHexa',
    },
    importRunning: {
        id: 'iaso.snt_malaria.settings.dataLayers.importRunning',
        defaultMessage: 'Importing data from OpenHexa…',
    },
    importFailed: {
        id: 'iaso.snt_malaria.settings.dataLayers.importFailed',
        defaultMessage: 'OpenHexa import failed',
    },
    layerSetupIncomplete: {
        id: 'iaso.snt_malaria.settings.dataLayers.layerSetupIncomplete',
        defaultMessage: 'Setup was not completed for this layer',
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
    compositeLayer: {
        id: 'iaso.snt_malaria.settings.dataLayers.compositeLayer',
        defaultMessage: 'Composite layer',
    },
    addToComparison: {
        id: 'ias.snt_malaria.settings.dataLayers.addToComparison',
        defaultMessage: 'Add to comparison maps',
    },
    genericError: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.genericError',
        defaultMessage: 'Please try again.',
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
    label: {
        id: 'iaso.snt_malaria.settings.dataLayers.label',
        defaultMessage: 'Name',
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
    expandCategory: {
        id: 'iaso.snt_malaria.settings.dataLayers.expandCategory',
        defaultMessage: 'Expand category',
    },
    collapseCategory: {
        id: 'iaso.snt_malaria.settings.dataLayers.collapseCategory',
        defaultMessage: 'Collapse category',
    },
    required: {
        id: 'iaso.snt_malaria.settings.dataLayers.errors.required',
        defaultMessage: 'This field is required',
    },
    scale: {
        id: 'iaso.snt_malaria.settings.dataLayers.scale',
        defaultMessage: 'Scale',
    },
    legendTopColor: {
        id: 'iaso.snt_malaria.settings.dataLayers.legendTopColor',
        defaultMessage: 'Colour for values above the last break',
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
    onboardingStep1Title: {
        id: 'iaso.snt_malaria.settings.dataLayers.onboarding.step1.title',
        defaultMessage: 'Create your first data layer',
    },
    onboardingStep1Description: {
        id: 'iaso.snt_malaria.settings.dataLayers.onboarding.step1.description',
        defaultMessage:
            'First, name and describe the layer you plan to import, and most importantly define the scale that will be used for display. For more information, view the documentation below.',
    },
    onboardingStep2Title: {
        id: 'iaso.snt_malaria.settings.dataLayers.onboarding.step2.title',
        defaultMessage: 'Import your indicator data',
    },
    onboardingStep2Description: {
        id: 'iaso.snt_malaria.settings.dataLayers.onboarding.step2.description',
        defaultMessage:
            'From this menu, choose "Download CSV Template" to download a CSV file where you only need to fill in the values for the layer you just defined. ' +
            'Then choose "Import CSV" to upload the file.',
    },
    onboardingDocumentationUrl: {
        id: 'iaso.snt_malaria.settings.dataLayers.onboarding.documentationUrl',
        defaultMessage:
            'https://docs.snt-toolbox.org/en/importer-des-donnees.html',
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
        defaultMessage: 'Data key',
    },
    is_population: {
        id: 'iaso.snt_malaria.settings.dataLayers.isPopulation',
        defaultMessage: 'Is Population',
    },
    selectYear: {
        id: 'iaso.snt_malaria.settings.dataLayers.selectYear',
        defaultMessage: 'Select Year',
    },
    importCSVYearCaption: {
        id: 'iaso.snt_malaria.settings.dataLayers.importCSVYearCaption',
        defaultMessage:
            'The year for which the metric values will be imported.',
    },
    wizardTitle: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.title',
        defaultMessage: 'New data layer',
    },
    wizardSaveChanges: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.saveChanges',
        defaultMessage: 'Save changes',
    },
    wizardStepType: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.stepType',
        defaultMessage: 'Type',
    },
    wizardStepDetails: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.stepDetails',
        defaultMessage: 'Details',
    },
    wizardStepData: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.stepData',
        defaultMessage: 'Data',
    },
    wizardStepGraph: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.stepGraph',
        defaultMessage: 'Graph',
    },
    wizardStepLegend: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.stepLegend',
        defaultMessage: 'Legend',
    },
    wizardBack: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.back',
        defaultMessage: 'Back',
    },
    wizardNext: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.next',
        defaultMessage: 'Next: {step}',
    },
    wizardTypeQuestion: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.typeQuestion',
        defaultMessage: 'What kind of layer is this?',
    },
    wizardImportCsvHint: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.importCsvHint',
        defaultMessage:
            'Upload a CSV to fill the table below, then fine-tune it there before saving.',
    },
    wizardAddYear: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.addYear',
        defaultMessage: 'Add year',
    },
    wizardRemoveYear: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.removeYear',
        defaultMessage: 'Remove {year}',
    },
    wizardManualPaste: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.manualPaste',
        defaultMessage: 'Paste from clipboard',
    },
    wizardManualFilledCount: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.manualFilledCount',
        defaultMessage: '{filled} of {total} values filled',
    },
    wizardManualPasteHelp: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.manualPasteHelp',
        defaultMessage:
            'Paste one value per line, in the district order shown, to fill a year column.',
    },
    wizardValueAboveHundred: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.valueAboveHundred',
        defaultMessage: 'Above 100 while units are percent',
    },
    wizardGridRegion: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.gridRegion',
        defaultMessage: 'Region',
    },
    wizardGridDistrict: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.gridDistrict',
        defaultMessage: 'District',
    },
    wizardSummaryAddsToCategory: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.summaryAddsToCategory',
        defaultMessage: 'Creating this layer adds it to {category}.',
    },
    wizardOpenHexaManualRefresh: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.openHexaManualRefresh',
        defaultMessage:
            'This layer keeps the snapshot you import until someone refreshes it from OpenHexa.',
    },
    wizardOpenHexaImportInfo: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.openHexaImportInfo',
        defaultMessage:
            'The layer was created and its values are loading from OpenHexa in the background — you can carry on through the wizard while it runs.',
    },
    wizardOpenHexaImportComplete: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.openHexaImportComplete',
        defaultMessage: 'Import complete — check the result table.',
    },
    wizardPreviewPlaceholder: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.previewPlaceholder',
        defaultMessage:
            'A preview of your layer appears here once you add its data.',
    },
    wizardDiscardLayerConfirm: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.discardLayerConfirm',
        defaultMessage:
            'Nothing is saved yet — leaving now discards this layer.',
    },
    wizardDiscardGraphConfirm: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.discardGraphConfirm',
        defaultMessage: 'Leaving now discards this layer and its graph.',
    },
    wizardDiscardCreatedConfirm: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.discardCreatedConfirm',
        defaultMessage:
            'Leaving now removes this layer and any values already imported for it.',
    },
    wizardDiscardEditConfirm: {
        id: 'iaso.snt_malaria.settings.dataLayers.wizard.discardEditConfirm',
        defaultMessage: 'Discard your unsaved changes to this layer?',
    },
});
