import { deleteRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export const useDeleteIntervention = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (interventionId: number) =>
            deleteRequest(`/api/snt_malaria/interventions/${interventionId}/`),
        invalidateQueryKey: ['interventionCategories'],
    });
