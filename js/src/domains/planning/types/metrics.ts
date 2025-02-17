export type MetricType = {
    name: string;
    description: string;
    source: string;
    units: string;
    comments: string;
    id: number;
};

export type MetricValue = {
    id: number;
    metric_type: number;
    org_unit: number;
    year: number | null;
    value: number;
};
