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

/** Comma-separated ids from the form → API ids; empty must be [] or PATCH omits the key and clears never persist. */
const orgUnitsFieldToApi = (value: unknown): number[] => {
    if (value === undefined || value === null || value === '') {
        return [];
    }
    if (typeof value !== 'string') {
        return [];
    }
    return value
        .split(',')
        .filter(s => s !== '')
        .map(s => parseInt(s, 10))
        .filter(id => Number.isFinite(id));
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

            const payload: Record<string, unknown> = {
                ...body,
                matching_criteria,
            };
            if (Object.prototype.hasOwnProperty.call(body, 'org_units_excluded')) {
                payload.org_units_excluded = orgUnitsFieldToApi(
                    body.org_units_excluded,
                );
            }
            if (Object.prototype.hasOwnProperty.call(body, 'org_units_included')) {
                payload.org_units_included = orgUnitsFieldToApi(
                    body.org_units_included,
                );
            }

            return body.id
                ? patchRequest(
                      `/api/snt_malaria/scenario_rules/${body.id}/`,
                      payload,
                  )
                : postRequest(`/api/snt_malaria/scenario_rules/`, payload);
        },
        invalidateQueryKey: ['interventionAssignments'],
        options: {
            onSuccess: replaceQueryData,
        },
        showSuccessSnackBar: false,
    });
};
