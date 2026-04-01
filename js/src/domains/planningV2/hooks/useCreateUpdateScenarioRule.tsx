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
    is_match_all?: boolean;
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
            let matching_criteria: Record<string, unknown> | null | undefined;
            if (body.is_match_all) {
                matching_criteria = { all: true };
            } else if (body.matching_criteria) {
                matching_criteria =
                    matchingCriteriaToJsonLogic(body.matching_criteria) ??
                    null;
            } else if (
                Object.prototype.hasOwnProperty.call(body, 'matching_criteria')
            ) {
                matching_criteria = null;
            }

            const { is_match_all: _isMatchAll, ...rest } = body;
            const payload: Record<string, unknown> = {
                ...rest,
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
