import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { putIntervention } from '../../planning/hooks/UseUpdateIntervention';
import { Intervention } from '../../planning/types/interventions';
import { CostBreakdownLine } from '../types/CostBreakdownLine';

export const useUpdateCostBreakdownLines = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: {
            intervention: Intervention;
            costs: CostBreakdownLine[];
        }) => {
            return Promise.all([
                putIntervention(body.intervention),
                postRequest(`/api/snt_malaria/cost_breakdown_lines/`, {
                    intervention: body.intervention.id,
                    costs: body.costs,
                }),
            ]);
        },
        invalidateQueryKey: ['costBreakdownLines', 'interventionCategories'],
    });
