import { deleteRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export const useDeleteGrant = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (grantId: number) =>
            deleteRequest(`/api/snt_malaria/grants/${grantId}/`),
        invalidateQueryKey: ['grants'],
    });
