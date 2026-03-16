import { UseMutationResult } from 'react-query';
import { patchRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

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
            `scenarioRules_${scenarioId}`,
            'interventionAssignments',
        ],
    });
