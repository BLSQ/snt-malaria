import { UseMutationResult } from 'react-query';
import { patchRequest, postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { GrantPayload } from '../types';

export const useSaveGrant = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: GrantPayload) =>
            body.id
                ? patchRequest(`/api/snt_malaria/grants/${body.id}/`, body)
                : postRequest('/api/snt_malaria/grants/', body),
        invalidateQueryKey: ['grants'],
    });
