import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MESSAGES } from '../messages';
import { ScaleDomainRange } from '../types/metrics';

export type ImportMetricValuesJsonPayload = {
    metric_type_id: number;
    years: number[];
    values: { org_unit_id: number; year: number; value: string }[];
};

export type ImportMetricValuesJsonResponse = {
    total_imported: number;
    suggested_legend_type?: string;
    suggested_legend_config?: ScaleDomainRange;
};

export const useImportMetricValuesJson = (): UseMutationResult<
    ImportMetricValuesJsonResponse,
    unknown,
    ImportMetricValuesJsonPayload
> =>
    useSnackMutation({
        mutationFn: (body: ImportMetricValuesJsonPayload) =>
            postRequest('/api/metricvalues/import_values/', body),
        invalidateQueryKey: ['metricCategories', 'metricValues'],
        snackSuccessMessage: MESSAGES.metricValuesImportSuccess,
        snackErrorMsg: MESSAGES.metricValuesImportError,
    });
