import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MESSAGES } from '../messages';

export type ImportMetricValuesJsonPayload = {
    metric_type_id: number;
    /** Every year this replaces — a year's rows are cleared even when no entry
     *  below has that year, so a cell the user emptied actually disappears. */
    years: number[];
    values: { org_unit_id: number; year: number; value: string }[];
};

/** The wizard's own value-entry table, sent as JSON instead of a CSV file — see
 *  `/api/metricvalues/import_values/`. Unlike `useImportMetricValues` (which
 *  upserts a CSV without clearing what it doesn't mention), this always replaces
 *  the submitted years' values with exactly what's given. */
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
