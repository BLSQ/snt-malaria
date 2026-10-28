import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { BUDGET_QUERY_KEYS } from '../../../constants/queryKeys';
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
        invalidateQueryKey: [
            'metricCategories',
            'metricValues',
            ...BUDGET_QUERY_KEYS,
        ],
        // This runs on the wizard's Data -> Legend transition; the wizard moving
        // on to the next step is feedback enough, so a success toast is noise.
        showSuccessSnackBar: false,
        snackErrorMsg: MESSAGES.metricValuesImportError,
    });
