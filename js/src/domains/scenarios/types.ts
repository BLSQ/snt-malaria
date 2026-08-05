export type User = {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    full_name: string;
};

export type Scenario = {
    id: number;
    created_by: User;
    name: string;
    description: string;
    start_year: number;
    end_year: number;
    data_layer_years: Record<string, number>;
    created_at: string; // ISO 8601 formatted date string
    updated_at: string; // ISO 8601 formatted date string
    is_locked: boolean;
};

export const getDataLayerYear = (
    dataLayerYears: Record<string, number> | undefined,
    metricTypeId: number | null | undefined,
): number | undefined =>
    metricTypeId != null ? dataLayerYears?.[String(metricTypeId)] : undefined;
