import { postRequest } from 'bluesquare-components';
import { useMutation, useQueryClient } from 'react-query';
import { ScenarioRuleAIRequest, ScenarioRuleAIResponse } from './types';

// Query keys any other scenario rule mutation invalidates (see useReorderScenarioRules,
// useCreateUpdateScenarioRule) - the AI endpoint persists rules itself, so on a response that
// changed anything, the same downstream state (rules list, assignments, impact, budget) needs a
// refresh.
const invalidateScenarioQueries = (
    queryClient: ReturnType<typeof useQueryClient>,
    scenarioId: number,
) => {
    queryClient.invalidateQueries([`scenarioRules_${scenarioId}`]);
    queryClient.invalidateQueries('interventionAssignments');
    queryClient.invalidateQueries('impact');
    queryClient.invalidateQueries('budget_by_grant');
};

export const useSendScenarioRuleAIMessage = (scenarioId: number) => {
    const queryClient = useQueryClient();
    return useMutation<ScenarioRuleAIResponse, Error, ScenarioRuleAIRequest>(
        (data: ScenarioRuleAIRequest) =>
            postRequest('/api/snt_malaria/scenario_rule_ai/', data),
        {
            onSuccess: data => {
                if (data.rules) {
                    invalidateScenarioQueries(queryClient, scenarioId);
                }
            },
        },
    );
};
