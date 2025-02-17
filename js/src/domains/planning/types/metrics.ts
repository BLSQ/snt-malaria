export type MetricType = {
    id: number;
    name: string;
    description: string;
    source: string;
    units: string;
    comments: string;
    category: string;
};

export type MetricValue = {
    id: number;
    metric_type: number;
    org_unit: number;
    year: number | null;
    value: number;
};
