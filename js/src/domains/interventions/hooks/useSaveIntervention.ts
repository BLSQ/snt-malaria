import { UseMutationResult } from 'react-query';
import { patchRequest, postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { InterventionPayload } from '../types';

export const useSaveIntervention = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: InterventionPayload) =>
            body.id
                ? patchRequest(`/api/snt_malaria/interventions/${body.id}/`, body)
                : postRequest('/api/snt_malaria/interventions/', body),
        invalidateQueryKey: ['interventionCategories'],
    });
