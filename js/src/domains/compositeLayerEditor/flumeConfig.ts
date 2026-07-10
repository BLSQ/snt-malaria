import React from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { Colors, Controls, FlumeConfig } from 'flume';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { MetricType } from '../dataLayers/types/metrics';
import { CompositeOutputPreview } from './components/CompositeOutputPreview';
import { MappingsControl } from './components/MappingsControl';
import { NameControl } from './components/NameControl';
import { NodeHelperText } from './components/NodeHelperText';
import { NodeMapPreview } from './components/NodeMapPreview';
import { MESSAGES } from './messages';
import { CompositePreviewState } from './types/compositeLayer';

type FormatMessage = ReturnType<typeof useSafeIntl>['formatMessage'];

export type MetricOption = {
    value: number;
    label: string;
};

/**
 * Context handed to Flume's controls via the `NodeEditor` `context` prop. The map preview controls
 * use it to render choropleths without threading props through Flume: `metricTypeById` powers the
 * per-data-layer preview, while `preview` holds the debounced, non-persisted evaluation of the whole
 * graph that drives the output node's live preview.
 */
export type CompositeEditorContext = {
    orgUnits: OrgUnit[];
    metricTypeById: Map<number, MetricType>;
    preview?: CompositePreviewState;
    /**
     * MetricType ids of the data layers wired into the output node (even behind transformations),
     * in traversal order. Used to order the "based on a data layer" legend picker connected-first.
     */
    connectedLayerIds?: number[];
};

/** Order metric options so the currently-connected data layers come first (in traversal order). */
const orderOptionsByConnected = (
    options: MetricOption[],
    connectedIds: number[] = [],
): MetricOption[] => {
    if (!connectedIds.length) return options;
    const optionByValue = new Map(
        options.map(option => [option.value, option]),
    );
    const connectedSet = new Set(connectedIds);
    const connected = connectedIds
        .map(id => optionByValue.get(id))
        .filter((option): option is MetricOption => option !== undefined);
    const rest = options.filter(option => !connectedSet.has(option.value));
    return [...connected, ...rest];
};

// Names given to the formula node's value inputs, in order: a, b, c, … Kept to single lowercase
// letters so they can be referenced directly in the infix expression and validated server-side.
const MAX_FORMULA_INPUTS = 26;
const formulaInputName = (index: number): string =>
    String.fromCharCode('a'.charCodeAt(0) + index);

/**
 * Number of value input ports to render on a formula node: every connected input plus one trailing
 * empty slot, so connecting an input always reveals a fresh one to grow the formula.
 */
const formulaInputCount = (connections: any): number => {
    const inputs = connections?.inputs ?? {};
    let highestConnected = -1;
    for (let i = 0; i < MAX_FORMULA_INPUTS; i += 1) {
        if (inputs[formulaInputName(i)]?.length) {
            highestConnected = i;
        }
    }
    return Math.min(highestConnected + 2, MAX_FORMULA_INPUTS);
};

// The formula node is evaluated with simpleeval on the backend, so its infix syntax (operators,
// conditionals, …) is documented there. Linked from the formula node's helper text.
const FORMULA_SYNTAX_DOCS_URL =
    'https://github.com/danthedeckie/simpleeval#operators';

/**
 * Builds a `helperText` port instance carrying a node's explainer text (the same text as the
 * add-node context menu) plus an optional documentation link. The content travels in a
 * per-instance custom control because that's the only per-port-instance override Flume supports
 * that can hold arbitrary props.
 */
const helperTextPort = (
    ports: any,
    text: string,
    link?: { href: string; label: string },
) =>
    ports.helperText({
        controls: [
            Controls.custom({
                name: 'helperText',
                label: '',
                render: () =>
                    React.createElement(NodeHelperText, {
                        text,
                        linkHref: link?.href,
                        linkLabel: link?.label,
                    }),
            }),
        ],
    });

/**
 * Builds the Flume graph configuration for the composite layer editor.
 *
 * Node types:
 * - `dataLayer`: pick an existing MetricType, outputs its per-org-unit values.
 * - `formula`:   infix expression over a dynamic number of inputs (`a`, `b`, `c`, …). Starts with
 *                a single input and grows one slot per connection. Evaluated on the backend
 *                (simpleeval).
 * - `classify`:  map a single numeric input to categories via threshold rules.
 * - `output`:    the single terminal node producing the composite layer. It is always present,
 *                cannot be added again and cannot be deleted.
 *
 * The serialized graph is executed server-side, so the control/port names here are the contract
 * consumed by `services/composite/evaluator.py`.
 */
export const createCompositeFlumeConfig = (
    metricOptions: MetricOption[],
    formatMessage: FormatMessage,
): FlumeConfig => {
    const config = new FlumeConfig();

    // Legend types offered on the output node. Values mirror `MetricType.LegendType` on the
    // backend; `auto` lets the backend pick based on whether the result is numeric or categorical.
    const legendTypeOptions = [
        { value: 'auto', label: formatMessage(MESSAGES.legendAuto) },
        { value: 'linear', label: formatMessage(MESSAGES.legendLinear) },
        { value: 'threshold', label: formatMessage(MESSAGES.legendThreshold) },
        { value: 'ordinal', label: formatMessage(MESSAGES.legendOrdinal) },
        { value: 'reference', label: formatMessage(MESSAGES.legendReference) },
    ];

    config
        // Connectable port carrying a per-org-unit numeric vector.
        .addPortType({
            type: 'layerValues',
            name: 'layerValues',
            label: formatMessage(MESSAGES.layerValuesPortLabel),
            color: Colors.blue,
        })
        // Data layer picker plus a collapsible mini-map preview of the picked layer. Both controls
        // share this port's data, so the preview reads the selected id straight from `portData`.
        .addPortType({
            type: 'metricSelect',
            name: 'metricType',
            label: formatMessage(MESSAGES.dataLayerNodeLabel),
            hidePort: true,
            controls: [
                Controls.select({
                    name: 'metricTypeId',
                    label: formatMessage(MESSAGES.dataLayerNodeLabel),
                    options: metricOptions,
                    placeholder: formatMessage(MESSAGES.dataLayerPlaceholder),
                }),
                Controls.custom({
                    name: 'mapPreview',
                    label: '',
                    // Flume hands a custom control (data, onChange, context, redraw, portProps,
                    // portData). `data`/`onChange` are this control's own persisted value (used to
                    // remember the expanded state); `portData` holds every control on THIS port, so
                    // we read the sibling select's value from it; `context` carries the org units +
                    // metric metadata.
                    render: (
                        data: any,
                        onChange: any,
                        context: CompositeEditorContext,
                        redraw: any,
                        _portProps: any,
                        portData: any,
                    ) => {
                        // Flume passes this port's shared control data here, so the sibling select's
                        // value lives at `metricTypeId`. Fall back to the whole-node shape just in
                        // case, then normalise the id.
                        const rawId =
                            portData?.metricTypeId ??
                            portData?.metricType?.metricTypeId;
                        const metricTypeId =
                            rawId === '' || rawId == null
                                ? undefined
                                : Number(rawId);
                        return React.createElement(NodeMapPreview, {
                            metricTypeId,
                            metricType: metricTypeId
                                ? context?.metricTypeById?.get(metricTypeId)
                                : undefined,
                            orgUnits: context?.orgUnits ?? [],
                            // `redraw` recomputes connection curves; call it while the node resizes
                            // (expand/collapse) so wires stay attached to the ports.
                            onResize: redraw,
                            // Persist the expanded state in this control's own data so it survives
                            // save/reload. Default to expanded until the user collapses it.
                            expanded: data?.expanded ?? true,
                            onExpandedChange: (next: boolean) =>
                                onChange({ ...(data || {}), expanded: next }),
                        });
                    },
                }),
            ],
        })
        // Infix formula input (control only, not connectable).
        .addPortType({
            type: 'formulaText',
            name: 'formula',
            label: formatMessage(MESSAGES.formulaNodeLabel),
            hidePort: true,
            controls: [
                Controls.text({
                    name: 'formula',
                    label: formatMessage(MESSAGES.formulaControlLabel),
                    placeholder: 'a * 0.6 + b',
                }),
            ],
        })
        // Explainer text rendered as the last entry of a transformation node's body, just above
        // the output port (control only, not connectable). The content is injected per node via
        // `helperTextPort` below, since Flume port instances can only override a fixed set of
        // fields (controls being one of them).
        .addPortType({
            type: 'helperText',
            name: 'helperText',
            label: '',
            hidePort: true,
            controls: [],
        })
        // Reclassify rules editor (control only, not connectable).
        .addPortType({
            type: 'classifyRules',
            name: 'config',
            label: formatMessage(MESSAGES.classesLabel),
            hidePort: true,
            controls: [
                Controls.custom({
                    name: 'rules',
                    label: formatMessage(MESSAGES.classesLabel),
                    defaultValue: { rules: [], default: '' },
                    render: (data: any, onChange: any) =>
                        React.createElement(MappingsControl, {
                            value: data,
                            onChange,
                        }),
                }),
            ],
        })
        // Composite layer name (control only, not connectable). Single-line input.
        .addPortType({
            type: 'nameText',
            name: 'name',
            label: formatMessage(MESSAGES.nameControlLabel),
            hidePort: true,
            controls: [
                Controls.custom({
                    name: 'name',
                    label: formatMessage(MESSAGES.nameControlLabel),
                    defaultValue: '',
                    render: (data: any, onChange: any) =>
                        React.createElement(NameControl, {
                            value: data,
                            label: formatMessage(MESSAGES.nameControlLabel),
                            placeholder: formatMessage(
                                MESSAGES.namePlaceholder,
                            ),
                            onChange,
                        }),
                }),
            ],
        })
        // Legend type picker for the output layer (control only, not connectable).
        .addPortType({
            type: 'legendType',
            name: 'legend',
            label: formatMessage(MESSAGES.legendTypeLabel),
            hidePort: true,
            controls: [
                Controls.select({
                    name: 'legendType',
                    label: formatMessage(MESSAGES.legendTypeLabel),
                    options: legendTypeOptions,
                    defaultValue: 'auto',
                }),
            ],
        })
        // Reference layer picker, shown on the output node only when the legend type is
        // "Based on a data layer". Reuses the same options as the data layer node's picker so it
        // looks and behaves identically.
        .addPortType({
            type: 'referenceLayer',
            name: 'referenceLayer',
            label: formatMessage(MESSAGES.legendReference),
            hidePort: true,
            controls: [
                Controls.select({
                    name: 'referenceMetricTypeId',
                    label: formatMessage(MESSAGES.copyLegendFrom),
                    options: metricOptions,
                    placeholder: formatMessage(
                        MESSAGES.firstConnectedLayerPlaceholder,
                    ),
                    // Connected data layers (from the editor context) are listed first; when none is
                    // explicitly picked the backend defaults to the first connected one.
                    getOptions: (
                        _inputData: any,
                        context: CompositeEditorContext,
                    ) =>
                        orderOptionsByConnected(
                            metricOptions,
                            context?.connectedLayerIds ?? [],
                        ),
                }),
            ],
        })
        // Live preview of the whole composite (control only, not connectable). Reads the debounced
        // graph evaluation from `context.preview`, so it needs no port data of its own.
        .addPortType({
            type: 'outputPreview',
            name: 'preview',
            label: '',
            hidePort: true,
            controls: [
                Controls.custom({
                    name: 'preview',
                    label: '',
                    render: (
                        data: any,
                        onChange: any,
                        context: CompositeEditorContext,
                        redraw: any,
                    ) =>
                        React.createElement(CompositeOutputPreview, {
                            preview: context?.preview,
                            orgUnits: context?.orgUnits ?? [],
                            onResize: redraw,
                            // Persist the expanded state in this control's own data so it survives
                            // save/reload. Default to expanded until the user collapses it.
                            defaultExpanded: data?.expanded ?? true,
                            onExpandedChange: (next: boolean) =>
                                onChange({ ...(data || {}), expanded: next }),
                        }),
                }),
            ],
        });

    config
        .addNodeType({
            type: 'dataLayer',
            label: formatMessage(MESSAGES.dataLayerNodeLabel),
            description: formatMessage(MESSAGES.dataLayerNodeDescription),
            sortIndex: 0,
            initialWidth: 330,
            inputs: (ports: any) => [ports.metricSelect()],
            outputs: (ports: any) => [
                ports.layerValues({
                    name: 'values',
                    label: formatMessage(MESSAGES.valuesPortLabel),
                }),
            ],
        })
        .addNodeType({
            type: 'formula',
            label: formatMessage(MESSAGES.formulaNodeLabel),
            description: formatMessage(MESSAGES.formulaNodeDescription),
            sortIndex: 1,
            initialWidth: 260,
            // Dynamic inputs: Flume calls this with the node's live connections, so returning a
            // function lets the port list grow as inputs get connected.
            inputs: (ports: any) => (_inputData: any, connections: any) => {
                const count = formulaInputCount(connections);
                const valuePorts = Array.from({ length: count }, (_, i) => {
                    const name = formulaInputName(i);
                    return ports.layerValues({ name, label: name });
                });
                return [
                    ...valuePorts,
                    ports.formulaText(),
                    helperTextPort(
                        ports,
                        formatMessage(MESSAGES.formulaNodeDescription),
                        {
                            href: FORMULA_SYNTAX_DOCS_URL,
                            label: formatMessage(MESSAGES.formulaSyntaxLink),
                        },
                    ),
                ];
            },
            outputs: (ports: any) => [
                ports.layerValues({
                    name: 'result',
                    label: formatMessage(MESSAGES.resultPortLabel),
                }),
            ],
        })
        .addNodeType({
            type: 'classify',
            label: formatMessage(MESSAGES.classifyNodeLabel),
            description: formatMessage(MESSAGES.classifyNodeDescription),
            sortIndex: 4,
            initialWidth: 320,
            inputs: (ports: any) => [
                ports.layerValues({
                    name: 'a',
                    label: formatMessage(MESSAGES.valuePortLabel),
                }),
                ports.classifyRules(),
                helperTextPort(
                    ports,
                    formatMessage(MESSAGES.classifyNodeDescription),
                ),
            ],
            outputs: (ports: any) => [
                ports.layerValues({
                    name: 'result',
                    label: formatMessage(MESSAGES.classPortLabel),
                }),
            ],
        })
        // Always present, cannot be added again or removed.
        .addNodeType({
            type: 'output',
            label: formatMessage(MESSAGES.outputNodeLabel),
            description: formatMessage(MESSAGES.outputNodeDescription),
            addable: false,
            deletable: false,
            sortIndex: 100,
            initialWidth: 330,
            // Dynamic inputs so the reference-layer picker only appears when the legend type is
            // "Based on a data layer" (Flume renders built-in controls unconditionally otherwise).
            inputs: (ports: any) => (inputData: any) => {
                const isReference =
                    inputData?.legend?.legendType === 'reference';
                return [
                    ports.layerValues({
                        name: 'layer',
                        label: formatMessage(MESSAGES.outputLayerPortLabel),
                    }),
                    ports.nameText(),
                    ports.legendType(),
                    ...(isReference ? [ports.referenceLayer()] : []),
                    ports.outputPreview(),
                ];
            },
            outputs: () => [],
        });

    return config;
};
