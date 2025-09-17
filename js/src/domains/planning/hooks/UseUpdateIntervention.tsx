import { UseMutationResult } from 'react-query';
import { putRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { Intervention } from '../types/interventions';

export const UseUpdateIntervention = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: Intervention) =>
            putRequest(`/api/snt_malaria/interventions/${body.id}/`, body),
        invalidateQueryKey: ['interventionCategories'],
    });
