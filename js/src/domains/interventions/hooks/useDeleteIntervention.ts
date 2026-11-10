import { deleteRequest } from 'bluesquare-components';
import { UseMutationResult, useQueryClient } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { BUDGET_QUERY_KEYS } from '../../../constants/queryKeys';

export type DeleteInterventionVariables = {
    interventionId: number;
    replaceWith?: number;
    removeFromRules?: boolean;
    affectedScenarioIds: number[];
};

const buildDeleteUrl = ({
    interventionId,
    replaceWith,
    removeFromRules,
}: DeleteInterventionVariables): string => {
    const params = new URLSearchParams();
    if (replaceWith) {
        params.set('replace_with', String(replaceWith));
    }
    if (removeFromRules) {
        params.set('remove_from_rules', 'true');
    }
    const query = params.toString();
    return `/api/snt_malaria/interventions/${interventionId}/${query ? `?${query}` : ''}`;
};

export const useDeleteIntervention = (): UseMutationResult<
    unknown,
    unknown,
    DeleteInterventionVariables
> => {
    const queryClient = useQueryClient();
    return useSnackMutation({
        mutationFn: (variables: DeleteInterventionVariables) =>
            deleteRequest(buildDeleteUrl(variables)),
        invalidateQueryKey: [
            'interventionCategories',
            ...BUDGET_QUERY_KEYS,
            'interventionAssignments',
            'impact',
        ],
        useApiErrorMessage: true,
        options: {
            onSuccess: (_data, { affectedScenarioIds }) => {
                affectedScenarioIds.forEach(scenarioId =>
                    queryClient.invalidateQueries(
                        `scenarioRules_${scenarioId}`,
                    ),
                );
            },
        },
    });
};
