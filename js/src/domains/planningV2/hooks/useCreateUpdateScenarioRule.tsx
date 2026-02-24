import { patchRequest, postRequest } from 'bluesquare-components';
import { UseMutationResult, useQueryClient } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import {
    InterventionProperties,
    MetricTypeCriterion,
    ScenarioRule,
} from '../types/scenarioRule';
import { matchingCriteriaToJsonLogic } from '../utils/jsonLogic';
import { ScenarioRuleResponse } from './useGetScenarioRules';

type ScenarioRulePayload = {
    id?: number;
    name: string;
    scenario: number;
    matching_criteria: MetricTypeCriterion[];
    intervention_properties: InterventionProperties[];
};

const useReplaceQueryData = (scenarioId: number) => {
    const queryClient = useQueryClient();
    return (data: ScenarioRuleResponse, variables: ScenarioRulePayload) => {
        queryClient.setQueryData(
            [`scenarioRules_${scenarioId}`],
            (oldData: ScenarioRule[]) => {
                if (variables.id) {
                    return oldData.map((rule: ScenarioRule) =>
                        rule.id === variables.id ? data : rule,
                    );
                } else {
                    return [data, ...(oldData || [])];
                }
            },
        );
    };
};

export const useCreateUpdateScenarioRule = (
    scenarioId: number,
): UseMutationResult => {
    const replaceQueryData = useReplaceQueryData(scenarioId);
    return useSnackMutation({
        mutationFn: (body: ScenarioRulePayload) => {
            const matching_criteria = matchingCriteriaToJsonLogic(
                body.matching_criteria,
            );
            return body.id
                ? patchRequest(`/api/snt_malaria/scenario_rules/${body.id}/`, {
                      ...body,
                      matching_criteria,
                  })
                : postRequest(`/api/snt_malaria/scenario_rules/`, {
                      ...body,
                      matching_criteria,
                  });
        },
        options: {
            onSuccess: replaceQueryData,
        },
        invalidateQueryKey: [`interventionAssignments_${scenarioId}`],
        showSuccessSnackBar: false,
    });
};
