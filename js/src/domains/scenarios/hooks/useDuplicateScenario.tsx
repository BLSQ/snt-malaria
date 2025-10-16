import { defineMessages } from 'react-intl';
import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

const MESSAGES = defineMessages({
    duplicateSuccess: {
        id: 'snt_malaria.label.scenario-duplicate-success',
        defaultMessage: 'Duplicated scenario successfully',
    },
    duplicateError: {
        id: 'snt_malaria.label.scenario-duplicate-error',
        defaultMessage: 'Error duplicating scenario',
    },
});

export const useDuplicateScenario = (
    onSuccess: (data: any) => void = _data => null,
): UseMutationResult =>
    useSnackMutation({
        mutationFn: (idToDuplicate: number) =>
            postRequest(`/api/snt_malaria/scenarios/duplicate/`, {
                id_to_duplicate: idToDuplicate,
            }),
        options: { onSuccess },
        invalidateQueryKey: ['scenarios'],
        snackSuccessMessage: MESSAGES.duplicateSuccess,
        snackErrorMsg: MESSAGES.duplicateError,
    });
