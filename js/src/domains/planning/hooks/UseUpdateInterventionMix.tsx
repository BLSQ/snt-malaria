import { UseMutationResult } from 'react-query';
import { patchRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { InterventionMix } from '../types/interventions';

export const UseUpdateInterventionMix = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: InterventionMix) =>
            patchRequest(
                `/api/snt_malaria/interventionmixes/${body.id}/`,
                body,
            ),
        invalidateQueryKey: [
            'interventionassignments',
            'budgets',
            'interventionMixes',
            'interventionPlans',
        ],
    });
