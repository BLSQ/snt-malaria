/** Mirrors `iaso/api/metrics/utils.py::REQUIRED_METRIC_VALUES_HEADERS` — the org-unit
 *  columns shared by the CSV import template and the manual-entry grid export. */
export const REQUIRED_METRIC_VALUES_HEADERS = [
    'ADM1_NAME',
    'ADM2_NAME',
    'ADM2_ID',
] as const;

export type WizardLayerType = 'data' | 'openhexa' | 'composite';

export type StandardValueMethod = 'csv' | 'manual';
