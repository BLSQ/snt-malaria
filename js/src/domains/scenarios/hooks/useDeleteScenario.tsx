import { defineMessages } from 'react-intl';
import { UseMutationResult } from 'react-query';
import { deleteRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

const MESSAGES = defineMessages({
    deleteSuccess: {
        id: 'snt_malaria.label.scenario-delete-success',
        defaultMessage: 'Scenario deleted successfully',
    },
    deleteError: {
        id: 'snt_malaria.label.scenario-delete-error',
        defaultMessage: 'Error when deleting Scenario',
    },
});
export const useDeleteScenario = (
    onSuccess: (data: any) => void = _data => null,
): UseMutationResult =>
    useSnackMutation({
        mutationFn: (id: number) =>
            deleteRequest(`/api/snt_malaria/scenarios/${id}/`),
        options: { onSuccess },
        invalidateQueryKey: ['scenarios'],
        snackSuccessMessage: MESSAGES.deleteSuccess,
        snackErrorMsg: MESSAGES.deleteError,
    });
