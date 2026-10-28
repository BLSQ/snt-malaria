import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { BUDGET_QUERY_KEYS } from '../../../constants/queryKeys';
import { MESSAGES } from '../messages';

export const useImportMetricValues = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: ({ file, year }: { file: File; year: number }) =>
            postRequest({
                url: `/api/metricvalues/import_from_csv/`,
                fileData: {
                    file: file,
                },
                data: year ? { year } : {},
            }),
        // metricCategories too, as metric categories contain metric values
        invalidateQueryKey: [
            'metricCategories',
            'metricValues',
            ...BUDGET_QUERY_KEYS,
        ],
        snackSuccessMessage: MESSAGES.metricValuesImportSuccess,
        snackErrorMsg: MESSAGES.metricValuesImportError,
    });
