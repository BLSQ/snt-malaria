import { deleteRequest } from 'bluesquare-components';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { UseMutationResult } from 'react-query';

export const useDeleteGrant = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (grantId: number) =>
            deleteRequest(`/api/snt_malaria/grants/${grantId}/`),
        invalidateQueryKey: ['grants'],
    });
