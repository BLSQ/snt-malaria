import React from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { Colors, Controls, FlumeConfig } from 'flume';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { LegendTypes } from '../../constants/legend';
import { MetricType } from '../dataLayers/types/metrics';
import { CompositeOutputPreview } from './components/CompositeOutputPreview';
import { MappingsControl } from './components/MappingsControl';
import { NodeHelperText } from './components/NodeHelperText';
import { NodeMapPreview } from './components/NodeMapPreview';
import { OrgUnitFilterControl } from './components/OrgUnitFilterControl';
import { StackPriorityControl } from './components/StackPriorityControl';
import { MESSAGES } from './messages';
import {
    OPERATOR_NODE_TYPES,
    OPERATOR_OUTPUT_PORT_NAME,
} from './nodeTypeRegistry';
import { CompositePreviewState } from './types/compositeLayer';
import { NODE_TYPES } from './types/flumeGraph';
import { getCompositeLegendOptions } from './utils/legendOptions';
import { DEFAULT_ORG_UNIT_SELECTION } from './utils/orgUnitSelection';
import { resolveStackOrder } from './utils/stackOrder';

type FormatMessage = ReturnType<typeof useSafeIntl>['formatMessage'];

export type MetricOption = {
    value: number;
    label: string;
};

/** Sentinel `selectedYear` value meaning "no pin" — a real (non-numeric) option, not just an
 * absent key, so it's always available to navigate back to after picking a year. */
export const ALL_YEARS_VALUE = 'all';

/** Parses a Flume control's raw persisted value into a real number, or `undefined` if unset. */
const parseControlNumber = (raw: unknown): number | undefined =>
    raw === '' || raw == null ? undefined : Number(raw);

/** Same as `parseControlNumber`, but also treats the "all years" sentinel as unset. */
const parsePinnedYear = (raw: unknown): number | undefined =>
    raw === ALL_YEARS_VALUE ? undefined : parseControlNumber(raw);

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
     * in traversal order. Used to order the reference layer picker connected-first.
     */
    connectedLayerIds?: number[];
    /**
     * Distinct years available per metric type, for every `dataLayer` node's picked layer. Powers
     * the "Yearly values" control's `getOptions` — a `Controls.select` resolves options
     * synchronously, so the underlying fetch is done once here rather than per-control.
     */
    yearsByMetricTypeId?: Map<number, number[]>;
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

// Names given to the value inputs of nodes with a dynamic input count (formula, combine), in
// order: a, b, c, … Kept to single lowercase letters so they can be referenced directly in a
// formula's infix expression and validated server-side.
const MAX_DYNAMIC_INPUTS = 26;
const dynamicInputName = (index: number): string =>
    String.fromCharCode('a'.charCodeAt(0) + index);

/**
 * Number of value input ports to render on a dynamic-input node: every connected input plus one
 * trailing empty slot, so connecting an input always reveals a fresh one.
 */
const dynamicInputCount = (connections: any): number => {
    const inputs = connections?.inputs ?? {};
    let highestConnected = -1;
    for (let i = 0; i < MAX_DYNAMIC_INPUTS; i += 1) {
        if (inputs[dynamicInputName(i)]?.length) {
            highestConnected = i;
        }
    }
    return Math.min(highestConnected + 2, MAX_DYNAMIC_INPUTS);
};

/** Dynamic-input port names that currently have a connection, in slot order (a, b, c, …). */
const connectedDynamicInputNames = (connections: any): string[] => {
    const inputs = connections?.inputs ?? {};
    const names: string[] = [];
    for (let i = 0; i < MAX_DYNAMIC_INPUTS; i += 1) {
        const name = dynamicInputName(i);
        if (inputs[name]?.length) names.push(name);
    }
    return names;
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

/** Flume `inputs` factory for nodes with a growing list of value ports plus fixed trailing ports. */
const dynamicValueInputs =
    (ports: any, ...trailingPorts: any[]) =>
    (_inputData: any, connections: any) => {
        const count = dynamicInputCount(connections);
        const valuePorts = Array.from({ length: count }, (_, i) => {
            const name = dynamicInputName(i);
            return ports.layerValues({ name, label: name });
        });
        return [...valuePorts, ...trailingPorts];
    };

/**
 * Builds the Flume graph configuration for the composite layer editor.
 *
 * Node types:
 * - `dataLayer`: pick an existing MetricType, outputs its per-org-unit values.
 * - `formula`:   infix expression over a dynamic number of inputs (`a`, `b`, `c`, …). Starts with
 *                a single input and grows one slot per connection. Evaluated on the backend
 *                (simpleeval).
 * - `combine`:   reduce a dynamic number of inputs per org unit (mean/sum/min/max), or stack them
 *                by priority (each org unit takes the highest-priority input that has a value).
 * - `normalize`: min-max rescale a single numeric input to 0-1 or 0-100, per year.
 * - `classify`:  map a single numeric input to categories via threshold rules.
 * - `filter`:    restrict a single input to a selected set of org units.
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

    const legendTypeOptions = getCompositeLegendOptions(formatMessage);

    // Distinct years available for a `dataLayer` node's currently-picked metric type, or `[]` if
    // none is picked yet — shared by the "Yearly values" select's options and by the node's own
    // `inputs` (which hides that select and its helper text entirely when there's nothing to pin).
    const getYearsForMetricType = (
        inputData: any,
        context: CompositeEditorContext,
    ): number[] => {
        const metricTypeId = parseControlNumber(
            inputData?.metricType?.metricTypeId,
        );
        return (
            (metricTypeId != null &&
                context?.yearsByMetricTypeId?.get(metricTypeId)) ||
            []
        );
    };

    const metricTypeIdControl = Controls.select({
        name: 'metricTypeId',
        label: formatMessage(MESSAGES.dataLayerNodeLabel),
        options: metricOptions,
        placeholder: formatMessage(MESSAGES.dataLayerPlaceholder),
    });

    // Only included on the node when its picked layer actually has years (see the `dataLayer`
    // node's `inputs` below) — nothing to pin on an already-timeless layer.
    const selectedYearControl = Controls.select({
        name: 'selectedYear',
        label: formatMessage(MESSAGES.yearlyValuesLabel),
        // Shown once a node has no picked year yet — same wording as the "yearly"
        // option itself, so a fresh node reads the same whether or not `defaultValue`
        // below has actually been applied to it yet.
        placeholder: formatMessage(MESSAGES.yearlyOptionLabel),
        defaultValue: ALL_YEARS_VALUE,
        // Options depend on which layer THIS node has picked, so they're computed from
        // the whole node's `inputData` (Flume's `getOptions` receives it, unlike a
        // custom control's `portData`) plus `context.yearsByMetricTypeId` — fetched once
        // for every data layer node up in the editor, not per-control (a `Controls.select`
        // resolves options synchronously, so it can't fetch its own years).
        getOptions: (inputData: any, context: CompositeEditorContext) => [
            {
                value: ALL_YEARS_VALUE,
                label: formatMessage(MESSAGES.yearlyOptionLabel),
            },
            ...getYearsForMetricType(inputData, context).map(year => ({
                value: year,
                label: String(year),
            })),
        ],
    });

    // Paired with `selectedYearControl` — included/excluded together.
    const yearlyValuesHelperTextControl = Controls.custom({
        name: 'yearlyValuesHelperText',
        label: '',
        // Explains the `selectedYear` select just above (control only, no data of its
        // own) — placed here, inside this port, so it sits right under that dropdown
        // rather than under the map preview below.
        render: () =>
            React.createElement(NodeHelperText, {
                text: formatMessage(MESSAGES.yearlyValuesHelperText),
            }),
    });

    const mapPreviewControl = Controls.custom({
        name: 'mapPreview',
        label: '',
        // Flume hands a custom control (data, onChange, context, redraw, portProps, portData).
        // `data`/`onChange` are this control's own persisted value (used to remember the expanded
        // state); `portData` holds every control on THIS port, so the sibling selects' values are
        // read from it (falling back to the whole-node shape just in case); `context` carries the
        // org units + metric metadata.
        render: (
            data: any,
            onChange: any,
            context: CompositeEditorContext,
            redraw: any,
            _portProps: any,
            portData: any,
        ) => {
            const metricTypeId = parseControlNumber(
                portData?.metricTypeId ?? portData?.metricType?.metricTypeId,
            );
            const pinnedYear = parsePinnedYear(
                portData?.selectedYear ?? portData?.metricType?.selectedYear,
            );
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
                pinnedYear,
            });
        },
    });

    // The combine operation dropdown; extracted so the `combine` node can swap in a second control
    // (the stack priority list) alongside it without redefining the select itself.
    const combineOperationControl = Controls.select({
        name: 'operation',
        label: formatMessage(MESSAGES.combineOperationLabel),
        // Values are the reducer/operation names consumed by the backend evaluator.
        options: [
            { value: 'mean', label: formatMessage(MESSAGES.combineOpMean) },
            { value: 'sum', label: formatMessage(MESSAGES.combineOpSum) },
            { value: 'min', label: formatMessage(MESSAGES.combineOpMin) },
            { value: 'max', label: formatMessage(MESSAGES.combineOpMax) },
            {
                value: 'stack',
                label: formatMessage(MESSAGES.combineOpStack),
                description: formatMessage(MESSAGES.combineOpStackDescription),
            },
        ],
        defaultValue: 'mean',
    });

    // Only shown when `operation` is "stack": lets the user set the priority order of the
    // currently-connected inputs. `order` is resolved (see `resolveStackOrder`) before this is
    // instantiated per node in the `combine` node's `inputs` factory below, so the control itself
    // just renders and reorders it.
    const stackPriorityControl = (order: string[]) =>
        Controls.custom({
            name: 'priorityOrder',
            label: formatMessage(MESSAGES.stackPriorityLabel),
            defaultValue: [],
            render: (_data: any, onChange: any) =>
                React.createElement(StackPriorityControl, { order, onChange }),
        });

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
        // The node's `inputs` (below) overrides `controls` per instance to drop the year select +
        // its helper text when the picked layer has no years — this default is only a fallback.
        .addPortType({
            type: 'metricSelect',
            name: 'metricType',
            label: formatMessage(MESSAGES.dataLayerNodeLabel),
            hidePort: true,
            controls: [
                metricTypeIdControl,
                selectedYearControl,
                yearlyValuesHelperTextControl,
                mapPreviewControl,
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
        // Combine operation picker (control only, not connectable). Four of the five operations
        // are symmetric (order-independent) reducers, safe with unlabeled, interchangeable inputs
        // a, b, c, …; "stack" is the exception and gets a second control (see the `combine` node's
        // `inputs` factory below) once picked.
        .addPortType({
            type: 'combineOperation',
            name: 'operation',
            label: formatMessage(MESSAGES.combineOperationLabel),
            hidePort: true,
            controls: [combineOperationControl],
        })
        // District selection editor for the `filter` node (control only, not connectable): an
        // all/none base toggle plus a single override list, with a minimap preview.
        .addPortType({
            type: 'orgUnitSelection',
            name: 'selection',
            label: formatMessage(MESSAGES.filterDistrictsLabel),
            hidePort: true,
            controls: [
                Controls.custom({
                    name: 'orgUnits',
                    label: formatMessage(MESSAGES.filterDistrictsLabel),
                    defaultValue: DEFAULT_ORG_UNIT_SELECTION,
                    render: (
                        data: any,
                        onChange: any,
                        context: CompositeEditorContext,
                        redraw: any,
                    ) =>
                        React.createElement(OrgUnitFilterControl, {
                            value: data,
                            onChange,
                            orgUnits: context?.orgUnits ?? [],
                            onResize: redraw,
                        }),
                }),
            ],
        })
        // Normalize target scale picker (control only, not connectable).
        .addPortType({
            type: 'normalizeScale',
            name: 'scale',
            label: formatMessage(MESSAGES.normalizeScaleLabel),
            hidePort: true,
            controls: [
                Controls.select({
                    name: 'scale',
                    label: formatMessage(MESSAGES.normalizeScaleLabel),
                    // Values are the numeric upper bound, consumed by the backend evaluator.
                    options: [
                        { value: '1', label: '0 – 1' },
                        { value: '100', label: '0 – 100' },
                    ],
                    defaultValue: '1',
                }),
                Controls.select({
                    name: 'normalizeType',
                    label: formatMessage(MESSAGES.normalizeTypeLabel),
                    // Values are consumed by the backend evaluator.
                    options: [
                        {
                            value: 'min-max',
                            label: formatMessage(
                                MESSAGES.normalizeTypeMinMaxLabel,
                            ),
                            description: formatMessage(
                                MESSAGES.normalizeTypeMinMaxDescription,
                            ),
                        },
                        {
                            value: 'percentile',
                            label: formatMessage(
                                MESSAGES.normalizeTypePercentileLabel,
                            ),
                            description: formatMessage(
                                MESSAGES.normalizeTypePercentileDescription,
                            ),
                        },
                    ],
                    defaultValue: 'min-max',
                }),
            ],
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
                    defaultValue: LegendTypes.AUTO,
                }),
            ],
        })
        // Reference layer picker, shown on the output node only when the legend type is "Use
        // reference layer". Reuses the data layer node's picker options so it behaves identically.
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
            type: NODE_TYPES.dataLayer,
            label: formatMessage(MESSAGES.dataLayerNodeLabel),
            description: formatMessage(MESSAGES.dataLayerNodeDescription),
            sortIndex: 0,
            initialWidth: 330,
            // Dynamic so the year select + its helper text can drop out entirely once the picked
            // layer is known to have no years — Flume re-runs this on every `inputData` change
            // (the same mechanism the `formula` node already uses for its growing input list).
            inputs: (ports: any) =>
                (
                    inputData: any,
                    _connections: any,
                    context: CompositeEditorContext,
                ) => {
                    const hasYears =
                        getYearsForMetricType(inputData, context).length > 0;
                    return [
                        ports.metricSelect({
                            controls: hasYears
                                ? [
                                      metricTypeIdControl,
                                      selectedYearControl,
                                      yearlyValuesHelperTextControl,
                                      mapPreviewControl,
                                  ]
                                : [metricTypeIdControl, mapPreviewControl],
                        }),
                    ];
                },
            outputs: (ports: any) => [
                ports.layerValues({
                    name: 'values',
                    label: formatMessage(MESSAGES.valuesPortLabel),
                }),
            ],
        })
        .addNodeType({
            type: NODE_TYPES.formula,
            label: formatMessage(OPERATOR_NODE_TYPES.formula.labelMessage),
            description: formatMessage(
                OPERATOR_NODE_TYPES.formula.descriptionMessage,
            ),
            sortIndex: OPERATOR_NODE_TYPES.formula.sortIndex,
            initialWidth: OPERATOR_NODE_TYPES.formula.width,
            // Dynamic inputs: Flume calls this with the node's live connections, so returning a
            // function lets the port list grow as inputs get connected.
            inputs: (ports: any) =>
                dynamicValueInputs(
                    ports,
                    ports.formulaText(),
                    helperTextPort(
                        ports,
                        formatMessage(MESSAGES.formulaNodeDescription),
                        {
                            href: FORMULA_SYNTAX_DOCS_URL,
                            label: formatMessage(MESSAGES.formulaSyntaxLink),
                        },
                    ),
                ),
            outputs: (ports: any) => [
                ports.layerValues({
                    name: OPERATOR_OUTPUT_PORT_NAME,
                    label: formatMessage(MESSAGES.resultPortLabel),
                }),
            ],
        })
        .addNodeType({
            type: NODE_TYPES.combine,
            label: formatMessage(OPERATOR_NODE_TYPES.combine.labelMessage),
            description: formatMessage(
                OPERATOR_NODE_TYPES.combine.descriptionMessage,
            ),
            sortIndex: OPERATOR_NODE_TYPES.combine.sortIndex,
            initialWidth: OPERATOR_NODE_TYPES.combine.width,
            // Unlike the other dynamic-input nodes, this one needs `inputData` (not just
            // `connections`) to know whether to show the stack priority control, so it can't share
            // the generic `dynamicValueInputs` helper.
            inputs: (ports: any) =>
                (inputData: any, connections: any) => {
                    const isStack =
                        inputData?.operation?.operation === 'stack';
                    const connected = connectedDynamicInputNames(connections);
                    const order = resolveStackOrder(
                        inputData?.operation?.priorityOrder,
                        connected,
                    );
                    const count = dynamicInputCount(connections);
                    const valuePorts = Array.from(
                        { length: count },
                        (_, i) => {
                            const name = dynamicInputName(i);
                            const rank = order.indexOf(name);
                            // In stack mode the port label carries its resolved rank, so the wire
                            // itself reads e.g. "b (2)" - directly linking it to the priority row.
                            return ports.layerValues({
                                name,
                                label:
                                    isStack && rank >= 0
                                        ? `${name} (${rank + 1})`
                                        : name,
                            });
                        },
                    );
                    return [
                        ...valuePorts,
                        ports.combineOperation({
                            controls: isStack
                                ? [
                                      combineOperationControl,
                                      stackPriorityControl(order),
                                  ]
                                : [combineOperationControl],
                        }),
                        // Stack mode's hint lives inside the priority control itself, above the order list.
                        ...(isStack
                            ? []
                            : [
                                  helperTextPort(
                                      ports,
                                      formatMessage(
                                          MESSAGES.combineNodeDescription,
                                      ),
                                  ),
                              ]),
                    ];
                },
            outputs: (ports: any) => [
                ports.layerValues({
                    name: OPERATOR_OUTPUT_PORT_NAME,
                    label: formatMessage(MESSAGES.resultPortLabel),
                }),
            ],
        })
        .addNodeType({
            type: NODE_TYPES.normalize,
            label: formatMessage(OPERATOR_NODE_TYPES.normalize.labelMessage),
            description: formatMessage(
                OPERATOR_NODE_TYPES.normalize.descriptionMessage,
            ),
            sortIndex: OPERATOR_NODE_TYPES.normalize.sortIndex,
            initialWidth: OPERATOR_NODE_TYPES.normalize.width,
            inputs: (ports: any) => [
                ports.layerValues({
                    name: 'a',
                    label: formatMessage(MESSAGES.valuePortLabel),
                }),
                ports.normalizeScale(),
                helperTextPort(
                    ports,
                    formatMessage(MESSAGES.normalizeNodeDescription),
                ),
            ],
            outputs: (ports: any) => [
                ports.layerValues({
                    name: OPERATOR_OUTPUT_PORT_NAME,
                    label: formatMessage(MESSAGES.resultPortLabel),
                }),
            ],
        })
        .addNodeType({
            type: NODE_TYPES.classify,
            label: formatMessage(OPERATOR_NODE_TYPES.classify.labelMessage),
            description: formatMessage(
                OPERATOR_NODE_TYPES.classify.descriptionMessage,
            ),
            sortIndex: OPERATOR_NODE_TYPES.classify.sortIndex,
            initialWidth: OPERATOR_NODE_TYPES.classify.width,
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
                    name: OPERATOR_OUTPUT_PORT_NAME,
                    label: formatMessage(MESSAGES.classPortLabel),
                }),
            ],
        })
        .addNodeType({
            type: NODE_TYPES.filter,
            label: formatMessage(OPERATOR_NODE_TYPES.filter.labelMessage),
            description: formatMessage(
                OPERATOR_NODE_TYPES.filter.descriptionMessage,
            ),
            sortIndex: OPERATOR_NODE_TYPES.filter.sortIndex,
            initialWidth: OPERATOR_NODE_TYPES.filter.width,
            inputs: (ports: any) => [
                ports.layerValues({
                    name: 'a',
                    label: formatMessage(MESSAGES.valuePortLabel),
                }),
                ports.orgUnitSelection(),
                helperTextPort(
                    ports,
                    formatMessage(MESSAGES.filterNodeDescription),
                ),
            ],
            outputs: (ports: any) => [
                ports.layerValues({
                    name: OPERATOR_OUTPUT_PORT_NAME,
                    label: formatMessage(MESSAGES.resultPortLabel),
                }),
            ],
        })
        // Always present, cannot be added again or removed.
        .addNodeType({
            type: NODE_TYPES.output,
            label: formatMessage(MESSAGES.outputNodeLabel),
            description: formatMessage(MESSAGES.outputNodeDescription),
            addable: false,
            deletable: false,
            sortIndex: 100,
            initialWidth: 330,
            // Dynamic inputs so the reference-layer picker only appears when the legend type is
            // "Use reference layer" (Flume renders built-in controls unconditionally otherwise).
            inputs: (ports: any) => (inputData: any) => {
                const isReference =
                    inputData?.legend?.legendType === LegendTypes.REFERENCE;
                return [
                    ports.layerValues({
                        name: 'layer',
                        label: formatMessage(MESSAGES.outputLayerPortLabel),
                    }),
                    ports.legendType(),
                    ...(isReference ? [ports.referenceLayer()] : []),
                    ports.outputPreview(),
                ];
            },
            outputs: () => [],
        });

    return config;
};
