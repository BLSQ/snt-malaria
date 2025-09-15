import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { putIntervention } from '../../planning/hooks/UseUpdateIntervention';
import { Intervention } from '../../planning/types/interventions';
import { InterventionCostLine } from '../types/interventionCost';

export const UseUpdateInterventionCosts = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: {
            intervention: Intervention;
            costs: InterventionCostLine[];
        }) => {
            return Promise.all([
                putIntervention(body.intervention),
                postRequest(`/api/snt_malaria/interventioncosts/`, {
                    intervention_id: body.intervention.id,
                    costs: body.costs,
                }),
            ]);
        },
        invalidateQueryKey: ['interventionCosts', 'interventionCategories'],
    });
