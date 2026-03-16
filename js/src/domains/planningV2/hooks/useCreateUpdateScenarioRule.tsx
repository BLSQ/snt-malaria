import { patchRequest, postRequest } from 'bluesquare-components';
import { useQueryClient } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import {
    InterventionProperties,
    MetricTypeCriterion,
} from '../types/scenarioRule';
import { matchingCriteriaToJsonLogic } from '../utils/jsonLogic';
import { ScenarioRuleResponse } from './useGetScenarioRules';

type ScenarioRulePayload = {
    id?: number;
    name: string;
    scenario: number;
    matching_criteria: MetricTypeCriterion[];
    intervention_properties: InterventionProperties[];
    org_units_excluded?: string; // comma separated list of org unit ids
    org_units_included?: string; // comma separated list of org unit ids
};

const useReplaceQueryData = (scenarioId: number) => {
    const queryClient = useQueryClient();
    return (data: ScenarioRuleResponse, variables: ScenarioRulePayload) => {
        queryClient.setQueryData(
            [`scenarioRules_${scenarioId}`],
            (oldData?: ScenarioRuleResponse[]) => {
                if (!oldData) return [data];

                if (variables.id) {
                    return oldData.map((rule: ScenarioRuleResponse) =>
                        rule.id === variables.id ? data : rule,
                    );
                } else {
                    return [...(oldData || []), data];
                }
            },
        );
    };
};

export const useCreateUpdateScenarioRule = (scenarioId: number) => {
    const replaceQueryData = useReplaceQueryData(scenarioId);
    return useSnackMutation({
        mutationFn: (body: Partial<ScenarioRulePayload>) => {
            const matching_criteria = body.matching_criteria
                ? matchingCriteriaToJsonLogic(body.matching_criteria)
                : undefined;

            const org_units_excluded = body.org_units_excluded?.split(',');
            const org_units_included = body.org_units_included?.split(',');

            return body.id
                ? patchRequest(`/api/snt_malaria/scenario_rules/${body.id}/`, {
                      ...body,
                      matching_criteria,
                      org_units_excluded,
                      org_units_included,
                  })
                : postRequest(`/api/snt_malaria/scenario_rules/`, {
                      ...body,
                      matching_criteria,
                      org_units_excluded,
                      org_units_included,
                  });
        },
        invalidateQueryKey: ['interventionAssignments'],
        options: {
            onSuccess: replaceQueryData,
        },
        showSuccessSnackBar: false,
    });
};
