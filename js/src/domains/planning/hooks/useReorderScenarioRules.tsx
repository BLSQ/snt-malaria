import { UseMutationResult } from 'react-query';
import { patchRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { BUDGET_QUERY_KEYS } from '../../../constants/queryKeys';

export const useReorderScenarioRules = (
    scenarioId: number,
): UseMutationResult =>
    useSnackMutation({
        mutationFn: (newOrder: number[]) =>
            patchRequest(
                `/api/snt_malaria/scenarios/${scenarioId}/reorder_rules/`,
                {
                    new_order: newOrder,
                },
            ),
        showSuccessSnackBar: false,
        invalidateQueryKey: [
            ...BUDGET_QUERY_KEYS,
            `scenarioRules_${scenarioId}`,
            'interventionAssignments',
            'impact',
        ],
    });
