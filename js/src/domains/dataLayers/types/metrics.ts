export type MetricTypeCategory = {
    name: string;
    items: MetricType[];
};

export type MetricKind = 'population' | 'any';

export type MetricType = {
    id: number;
    name: string;
    code: string;
    description: string;
    source: string;
    units: string;
    unit_symbol: string;
    comments: string;
    category: string;
    legend_config: ScaleDomainRange;
    legend_type: string;
    origin: string;
    metric_kind?: MetricKind;
};

export type MetricTypeFormModel = {
    id?: number;
    name: string;
    code: string;
    description: string;
    source: string;
    units: string;
    unit_symbol: string;
    comments: string;
    category: string;
    legend_type: string;
    origin: string;
    legend_config: Scale[];
    /** OpenHexa legend colours beyond the editable scale rows (the extra top bucket). */
    legend_range_tail?: string[];
    is_population?: boolean;
    /** Composite = a layer built with the node editor rather than imported values. */
    is_composite?: boolean;
};

/** A data-layer definition read from the OpenHexa `SNT_metadata.json` file. */
export type OpenHexaDataLayer = {
    code: string;
    name: string;
    description: string;
    source: string;
    units: string;
    category: string;
    unit_symbol: string;
    legend_type: string;
    legend_config: ScaleDomainRange;
    metric_kind: MetricKind;
    /** Set when the layer can't be imported as-is (e.g. its scale doesn't fit its legend type). */
    error?: string;
};

export type MetricValue = {
    id: number;
    metric_type: number;
    org_unit: number;
    year: number | null;
    value: number;
    string_value: string;
};

export type Scale = {
    color: string;
    value: number | string;
};

export type ScaleDomainRange = {
    domain: number[] | string[];
    range: string[];
};

// Example MetricsFilter:
// [
//     {
//         ">=": [
//             { "var": "2" },
//             400
//         ]
//     },
//     {
//         ">=": [
//             { "var": "6" },
//             400
//         ]
//     }
// ]
// TODO: Simplified type, could be more complex I suppose
export type MetricsFilters = { and: Condition[] } | { or: Condition[] };

export type Condition =
    | {
          '>=': [MetricTypeRef | number, number];
      }
    | { '<=': [MetricTypeRef | number, number] }
    | { '==': [MetricTypeRef | number, number | string | boolean] }
    | { '!=': [MetricTypeRef | number, number | string | boolean] }
    | { '>': [MetricTypeRef | number, number] }
    | { '<': [MetricTypeRef | number, number] };

// TODO: For now only greater or eq than, but later maybe:
//   | { "<=": [MetricTypeRef | number, number] }
//   | { "==": [MetricTypeRef | number, number | string | boolean] }
//   | { "!=": [MetricTypeRef | number, number | string | boolean] }
//   | { ">": [MetricTypeRef | number, number] }
//   | { "<": [MetricTypeRef | number, number] }

type MetricTypeRef = {
    var: string;
};
