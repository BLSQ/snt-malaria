export type MetricType = {
    id: number;
    name: string;
    description: string;
    source: string;
    units: string;
    unit_symbol: string;
    comments: string;
    category: string;
    legend_threshold: ScaleDomainRange;
};

export type MetricValue = {
    id: number;
    metric_type: number;
    org_unit: number;
    year: number | null;
    value: number;
};

export type ScaleDomainRange = {
    domain: number[];
    range: string[];
};

// Example MetricsFilter:
// {
//   Incidence: { "171": "400" },
//   Prevalence: { "175": "35" }
// }
export type MetricsFilters = {
    [category: string]: {
        [metricId: string]: string;
    };
};
