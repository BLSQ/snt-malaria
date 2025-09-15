import { UseMutationResult } from 'react-query';
import { putRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { Intervention } from '../types/interventions';

export const putIntervention = (body: Intervention) =>
    putRequest(`/api/snt_malaria/interventions/${body.id}/`, body);

export const UseUpdateIntervention = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: putIntervention,
        invalidateQueryKey: ['interventionCategories'],
    });
