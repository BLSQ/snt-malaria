import { deleteRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export const useDeleteInterventionCategory = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (categoryId: number) =>
            deleteRequest(
                `/api/snt_malaria/intervention_categories/${categoryId}/`,
            ),
        invalidateQueryKey: ['interventionCategories'],
        useApiErrorMessage: true,
    });
