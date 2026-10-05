import { JsonLogicTree } from '@react-awesome-query-builder/mui';
import { getRequest } from 'bluesquare-components';
import { UseQueryResult } from 'react-query';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { ScenarioRule } from '../types/scenarioRule';
import { mapResponseToScenarioRules } from '../utils/scenarioRuleMapper';

export type ScenarioRuleResponse = {
    id: number;
    name: string;
    scenario: number;
    priority: number;
    color: string;
    matching_criteria: JsonLogicTree;
    // Read-only, derived server-side: whether org_units_included already amounts to "every org
    // unit" - there is no "match all" sentinel in matching_criteria itself.
    is_match_all: boolean;
    interventions: number[];
    org_units_excluded?: number[];
    org_units_included?: number[];
};

export const useGetScenarioRules = (
    scenarioId: number,
): UseQueryResult<ScenarioRule[], Error> => {
    return useSnackQuery({
        queryKey: [`scenarioRules_${scenarioId}`],
        queryFn: () =>
            getRequest(
                `/api/snt_malaria/scenario_rules/?scenario=${scenarioId}`,
            ),
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
            select: mapResponseToScenarioRules,
        },
    });
};
