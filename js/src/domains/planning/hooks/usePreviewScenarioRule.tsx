import { postRequest } from 'bluesquare-components';
import { isEmpty, mapValues } from 'lodash';
import { UseQueryResult } from 'react-query';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { MetricsFilters } from '../../dataLayers/types/metrics';

export type ScenarioRulePreviewRequest = Record<string, MetricsFilters>;
export type ScenarioRulePreviewResult = Record<string, number[]>;

export const getPreviewScenarioRuleQueryKey = (
    rules: ScenarioRulePreviewRequest,
    dataLayerYears?: Record<string, number>,
) => ['scenarioRulePreview', rules, dataLayerYears ?? null];

export const usePreviewScenarioRule = (
    rules: ScenarioRulePreviewRequest,
    dataLayerYears?: Record<string, number>,
): UseQueryResult<ScenarioRulePreviewResult> =>
    useSnackQuery({
        queryKey: getPreviewScenarioRuleQueryKey(rules, dataLayerYears),
        queryFn: () =>
            isEmpty(rules)
                ? Promise.resolve({})
                : postRequest(`/api/snt_malaria/scenario_rules/preview/`, {
                      data_layer_years: dataLayerYears,
                      rules: mapValues(rules, matchingCriteria => ({
                          matching_criteria: matchingCriteria,
                      })),
                  }),
        options: {
            keepPreviousData: true,
            staleTime: Infinity,
        },
    });
