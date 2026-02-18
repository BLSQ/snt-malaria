export type MetricTypeCategory = {
    name: string;
    items: MetricType[];
};

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

type Condition = { '>=': [MetricTypeRef | number, number] };
// TODO: For now only greater or eq than, but later maybe:
//   | { "<=": [MetricTypeRef | number, number] }
//   | { "==": [MetricTypeRef | number, number | string | boolean] }
//   | { "!=": [MetricTypeRef | number, number | string | boolean] }
//   | { ">": [MetricTypeRef | number, number] }
//   | { "<": [MetricTypeRef | number, number] }

type MetricTypeRef = {
    var: string;
};
