import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MESSAGES } from '../messages';

export const useImportMetricValues = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (file: File) =>
            postRequest({
                url: `/api/metricvalues/import_from_csv/`,
                fileData: {
                    file: file,
                },
                data: {},
            }),
        invalidateQueryKey: ['metricCategories', 'metricValues'], // We need both as metric categories contain metric values
        snackSuccessMessage: MESSAGES.metricValuesImportSuccess,
        snackErrorMsg: MESSAGES.metricValuesImportError,
    });
