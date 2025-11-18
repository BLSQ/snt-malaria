import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export const useImportScenario = (
    onSuccess?: (data: any, variables: any, context: any) => void,
    onError?: (error: any, variables: any, context: any) => void,
): UseMutationResult =>
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
        options: {
            onSuccess,
            onError,
        },
    });
