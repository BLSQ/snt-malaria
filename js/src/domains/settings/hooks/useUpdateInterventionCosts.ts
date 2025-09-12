import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { InterventionCostLine } from '../../planning/types/interventions';

export const UseUpdateInterventionCosts = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: {
            intervention_id: number;
            costs: InterventionCostLine[];
        }) => postRequest(`/api/snt_malaria/interventioncosts/`, body),
        invalidateQueryKey: ['interventionCategories'],
    });
