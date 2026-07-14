import { defineMessages } from 'react-intl';

export const MESSAGES = defineMessages({
    title: {
        id: 'iaso.snt_malaria.compositeLayerEditor.title',
        defaultMessage: 'Composite layer editor',
    },
    newCompositeLayer: {
        id: 'iaso.snt_malaria.compositeLayerEditor.newCompositeLayer',
        defaultMessage: 'New composite layer',
    },
    showDataLayers: {
        id: 'iaso.snt_malaria.compositeLayerEditor.showDataLayers',
        defaultMessage: 'Show data layers',
    },
    hideDataLayers: {
        id: 'iaso.snt_malaria.compositeLayerEditor.hideDataLayers',
        defaultMessage: 'Hide data layers',
    },
    save: {
        id: 'iaso.snt_malaria.compositeLayerEditor.save',
        defaultMessage: 'Save',
    },
    cancel: {
        id: 'iaso.label.cancel',
        defaultMessage: 'Cancel',
    },
    close: {
        id: 'iaso.label.close',
        defaultMessage: 'Close',
    },
    saveSuccess: {
        id: 'iaso.snt_malaria.compositeLayerEditor.saveSuccess',
        defaultMessage: 'Composite layer created successfully.',
    },
    helper: {
        id: 'iaso.snt_malaria.compositeLayerEditor.helper',
        defaultMessage:
            'Right-click the canvas to add nodes, or drag a data layer from the list. Connect data layers into formula or reclassify nodes, then into the output node.',
    },
    disconnected: {
        id: 'iaso.snt_malaria.compositeLayerEditor.disconnected',
        defaultMessage: 'Connect a layer to the output node to preview it.',
    },
    deleteNode: {
        id: 'iaso.snt_malaria.compositeLayerEditor.deleteNode',
        defaultMessage: 'Delete node',
    },
    // Canvas controls.
    zoomIn: {
        id: 'iaso.snt_malaria.compositeLayerEditor.zoomIn',
        defaultMessage: 'Zoom in',
    },
    zoomOut: {
        id: 'iaso.snt_malaria.compositeLayerEditor.zoomOut',
        defaultMessage: 'Zoom out',
    },
    fitToContent: {
        id: 'iaso.snt_malaria.compositeLayerEditor.fitToContent',
        defaultMessage: 'Fit to content',
    },
    // Map previews.
    mapPreview: {
        id: 'iaso.snt_malaria.compositeLayerEditor.mapPreview',
        defaultMessage: 'Map preview',
    },
    selectLayerToPreview: {
        id: 'iaso.snt_malaria.compositeLayerEditor.selectLayerToPreview',
        defaultMessage: 'Select a layer to preview',
    },
    openLargerPreview: {
        id: 'iaso.snt_malaria.compositeLayerEditor.openLargerPreview',
        defaultMessage: 'Open larger preview',
    },
    year: {
        id: 'iaso.snt_malaria.compositeLayerEditor.year',
        defaultMessage: 'Year',
    },
    computingPreview: {
        id: 'iaso.snt_malaria.compositeLayerEditor.computingPreview',
        defaultMessage: 'Computing preview…',
    },
    previewConnectOutput: {
        id: 'iaso.snt_malaria.compositeLayerEditor.previewConnectOutput',
        defaultMessage: 'Connect the output node to preview it.',
    },
    previewNoResults: {
        id: 'iaso.snt_malaria.compositeLayerEditor.previewNoResults',
        defaultMessage: 'No results for the current org units.',
    },
    // Reclassify mappings editor.
    mappingsHelper: {
        id: 'iaso.snt_malaria.compositeLayerEditor.mappingsHelper',
        defaultMessage:
            'Rules are evaluated from top to bottom, and the first match is applied. Order them accordingly.',
    },
    mappingsElse: {
        id: 'iaso.snt_malaria.compositeLayerEditor.mappingsElse',
        defaultMessage: 'else',
    },
    mappingsValuePlaceholder: {
        id: 'iaso.snt_malaria.compositeLayerEditor.mappingsValuePlaceholder',
        defaultMessage: 'value',
    },
    mappingsClassPlaceholder: {
        id: 'iaso.snt_malaria.compositeLayerEditor.mappingsClassPlaceholder',
        defaultMessage: 'class',
    },
    // Flume node & port labels (the graph contract itself is language-neutral).
    layerValuesPortLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.layerValuesPortLabel',
        defaultMessage: 'Layer values',
    },
    dataLayerNodeLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.dataLayerNodeLabel',
        defaultMessage: 'Data layer',
    },
    dataLayerNodeDescription: {
        id: 'iaso.snt_malaria.compositeLayerEditor.dataLayerNodeDescription',
        defaultMessage:
            'Use an existing data layer (including composites) as an input.',
    },
    dataLayerPlaceholder: {
        id: 'iaso.snt_malaria.compositeLayerEditor.dataLayerPlaceholder',
        defaultMessage: '[Select a data layer]',
    },
    valuesPortLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.valuesPortLabel',
        defaultMessage: 'Values',
    },
    formulaNodeLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.formulaNodeLabel',
        defaultMessage: 'Formula',
    },
    formulaNodeDescription: {
        id: 'iaso.snt_malaria.compositeLayerEditor.formulaNodeDescription',
        defaultMessage:
            'Combine inputs with an infix formula. Inputs are referenced as a, b, c… ' +
            'Starts with one input and adds another each time you connect one. Inputs and the ' +
            'result can be numbers or text, so you can branch to labels, e.g. "HIGH" if a > 100 else "LOW".',
    },
    formulaControlLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.formulaControlLabel',
        defaultMessage:
            'Formula (e.g. a * 0.6 + b, or "HIGH" if a > 100 else "LOW")',
    },
    resultPortLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.resultPortLabel',
        defaultMessage: 'Result',
    },
    classifyNodeLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.classifyNodeLabel',
        defaultMessage: 'Reclassify',
    },
    classifyNodeDescription: {
        id: 'iaso.snt_malaria.compositeLayerEditor.classifyNodeDescription',
        defaultMessage:
            'Map a single input to categories using threshold rules (e.g. < 100 → LOW).',
    },
    classesLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.classesLabel',
        defaultMessage: 'Classes',
    },
    valuePortLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.valuePortLabel',
        defaultMessage: 'Value',
    },
    classPortLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.classPortLabel',
        defaultMessage: 'Class',
    },
    outputNodeLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.outputNodeLabel',
        defaultMessage: 'Composite layer (output)',
    },
    outputNodeDescription: {
        id: 'iaso.snt_malaria.compositeLayerEditor.outputNodeDescription',
        defaultMessage: 'The final composite layer that will be saved.',
    },
    outputLayerPortLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.outputLayerPortLabel',
        defaultMessage: 'Composite layer',
    },
    nameControlLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.nameControlLabel',
        defaultMessage: 'Composite layer name',
    },
    namePlaceholder: {
        id: 'iaso.snt_malaria.compositeLayerEditor.namePlaceholder',
        defaultMessage: 'My composite layer',
    },
    // Legend controls on the output node.
    legendTypeLabel: {
        id: 'iaso.snt_malaria.compositeLayerEditor.legendTypeLabel',
        defaultMessage: 'Legend type',
    },
    legendAuto: {
        id: 'iaso.snt_malaria.compositeLayerEditor.legendAuto',
        defaultMessage: 'Auto (based on connected data)',
    },
    legendLinear: {
        id: 'iaso.snt_malaria.compositeLayerEditor.legendLinear',
        defaultMessage: 'Linear',
    },
    legendThreshold: {
        id: 'iaso.snt_malaria.compositeLayerEditor.legendThreshold',
        defaultMessage: 'Threshold',
    },
    legendOrdinal: {
        id: 'iaso.snt_malaria.compositeLayerEditor.legendOrdinal',
        defaultMessage: 'Ordinal',
    },
    legendReference: {
        id: 'iaso.snt_malaria.compositeLayerEditor.legendReference',
        defaultMessage: 'Based on a data layer',
    },
    copyLegendFrom: {
        id: 'iaso.snt_malaria.compositeLayerEditor.copyLegendFrom',
        defaultMessage: 'Copy legend from',
    },
    firstConnectedLayerPlaceholder: {
        id: 'iaso.snt_malaria.compositeLayerEditor.firstConnectedLayerPlaceholder',
        defaultMessage: '[First connected layer]',
    },
});
