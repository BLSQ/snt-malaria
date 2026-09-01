import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { Intervention } from '../types';

export const useDuplicateIntervention = (): UseMutationResult<Intervention> =>
    useSnackMutation({
        mutationFn: (interventionId: number) =>
            postRequest(
                `/api/snt_malaria/interventions/${interventionId}/duplicate/`,
                {},
            ),
        invalidateQueryKey: ['interventionCategories'],
    });
