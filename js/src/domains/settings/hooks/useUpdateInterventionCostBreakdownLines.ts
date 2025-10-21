import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { InterventionCostBreakdownLine } from '../types/InterventionCostBreakdownLine';

export const useUpdateInterventionCostBreakdownLines = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: {
            interventionId: number;
            costs: InterventionCostBreakdownLine[];
        }) => {
            return Promise.all([
                postRequest(
                    `/api/snt_malaria/intervention_cost_breakdown_lines/`,
                    {
                        intervention: body.interventionId,
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
