import { deleteRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { UseMutationResult } from 'react-query';

const deleteInterventionMix = id =>
    deleteRequest(`/api/snt_malaria/interventionmixes/${id}/`);

export const UseDeleteIntervenetionMix = (): UseMutationResult => {
    return useSnackMutation({
        mutationFn: deleteInterventionMix,
        invalidateQueryKey: [
            'interventionassignments',
            'budgets',
            'interventionMixes',
            'interventionPlans',
        ],
    });
};
