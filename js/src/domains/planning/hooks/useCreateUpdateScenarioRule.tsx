import { patchRequest, postRequest } from 'bluesquare-components';
import { useQueryClient } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { ScenarioRuleResponse } from '../hooks/useGetScenarioRules';
import {
    InterventionProperties,
    MetricTypeCriterion,
} from '../types/scenarioRule';
import { matchingCriteriaToJsonLogic } from '../utils/jsonLogic';

type ScenarioRulePayload = {
    id?: number;
    name: string;
    scenario: number;
    is_match_all?: boolean;
    matching_criteria: MetricTypeCriterion[];
    intervention_properties: InterventionProperties[];
    org_units_excluded?: string; // comma separated list of org unit ids
    org_units_included?: string; // comma separated list of org unit ids
};

/** Comma-separated ids from the form → API integer array; empty/missing → []. */
const orgUnitsFieldToApi = (value: unknown): number[] => {
    if (typeof value !== 'string' || value === '') return [];
    return value
        .split(',')
        .filter(s => s !== '')
        .map(s => parseInt(s, 10))
        .filter(id => Number.isFinite(id));
};

/**
 * Map the form's is_match_all + matching_criteria into the single API
 * matching_criteria field.  Returns undefined when neither field changed
 * (so PATCH won't touch it).
 */
const resolveMatchingCriteria = (
    body: Partial<ScenarioRulePayload>,
): Record<string, unknown> | null | undefined => {
    if (body.is_match_all) {
        return { all: true };
    }
    if (body.matching_criteria?.length) {
        return matchingCriteriaToJsonLogic(body.matching_criteria) ?? null;
    }
    if ('matching_criteria' in body || 'is_match_all' in body) {
        return null;
    }
    return undefined;
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
            const { is_match_all: _, ...rest } = body;
            const payload: Record<string, unknown> = {
                ...rest,
                matching_criteria: resolveMatchingCriteria(body),
            };
            if ('org_units_excluded' in body) {
                payload.org_units_excluded = orgUnitsFieldToApi(
                    body.org_units_excluded,
                );
            }
            if ('org_units_included' in body) {
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
        invalidateQueryKey: [
            'interventionAssignments',
            'impact',
            'budgetAssumptions',
        ],
        options: {
            onSuccess: replaceQueryData,
        },
        showSuccessSnackBar: false,
    });
};
