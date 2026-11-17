import { postRequest } from 'bluesquare-components';
import { UseQueryResult } from 'react-query';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { MetricsFilters } from '../../dataLayers/types/metrics';
import { MetricTypeCriterion } from '../types/scenarioRule';

export type ScenarioRulePreviewResult = {
    ids: number[];
    criteria: MetricTypeCriterion[];
};

export const getPreviewScenarioRuleQueryKey = (
    jsonLogic: MetricsFilters | null,
    dataLayerYears?: Record<string, number>,
) => ['scenarioRulePreview', jsonLogic, dataLayerYears ?? null];

export const usePreviewScenarioRule = (
    matchingCriteria: MetricTypeCriterion[],
    jsonLogic: MetricsFilters | null,
    dataLayerYears?: Record<string, number>,
): UseQueryResult<ScenarioRulePreviewResult> =>
    useSnackQuery({
        queryKey: getPreviewScenarioRuleQueryKey(jsonLogic, dataLayerYears),
        queryFn: async () => ({
            ids: jsonLogic
                ? (
                      await postRequest(
                          `/api/snt_malaria/scenario_rules/preview/`,
                          {
                              data_layer_years: dataLayerYears,
                              rules: { rule: { matching_criteria: jsonLogic } },
                          },
                      )
                  ).rule
                : [],
            criteria: matchingCriteria,
        }),
        options: {
            keepPreviousData: true,
            staleTime: Infinity,
        },
    });
