import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MESSAGES } from '../messages';

export type ImportMetricValuesJsonPayload = {
    metric_type_id: number;
    years: number[];
    values: { org_unit_id: number; year: number; value: string }[];
};

export const useImportMetricValuesJson = (): UseMutationResult<
    unknown,
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
