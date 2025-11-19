import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MESSAGES } from '../../messages';

export const useImportScenario = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (file: File) =>
            postRequest({
                url: `/api/snt_malaria/scenarios/import_from_csv/`,
                fileData: {
                    file: file,
                },
                data: {},
            }),
        invalidateQueryKey: ['scenarios'],
        snackSuccessMessage: MESSAGES.scenarioImportSuccess,
        snackErrorMsg: MESSAGES.scenarioImportError,
    });
