import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { putIntervention } from '../../planning/hooks/useUpdateIntervention';
import { Intervention } from '../../planning/types/interventions';
import { InterventionCostBreakdownLine } from '../types/InterventionCostBreakdownLine';

export const useUpdateInterventionCostBreakdownLines = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: {
            intervention: Intervention;
            costs: InterventionCostBreakdownLine[];
        }) => {
            return Promise.all([
                putIntervention(body.intervention),
                postRequest(
                    `/api/snt_malaria/intervention_cost_breakdown_lines/`,
                    {
                        intervention: body.intervention.id,
                        costs: body.costs,
                    },
                ),
            ]);
        },
        invalidateQueryKey: [
            'interventionCostBreakdownLines',
            'interventionCategories',
        ],
    });
