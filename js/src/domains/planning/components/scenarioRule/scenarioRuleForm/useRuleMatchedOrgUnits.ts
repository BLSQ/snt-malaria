import { useMemo } from 'react';
import { useDebounce } from 'bluesquare-components';
import { groupBy, isEmpty, mapValues, omit, pickBy } from 'lodash';
import { useQueryClient } from 'react-query';
import {
    getPreviewScenarioRuleQueryKey,
    ScenarioRulePreviewRequest,
    usePreviewScenarioRule,
} from '../../../hooks/usePreviewScenarioRule';
import { MetricTypeCriterion } from '../../../types/scenarioRule';
import { matchingCriteriaToJsonLogic } from '../../../utils/jsonLogic';

const DEBOUNCE_MS = 500;
const RULE_KEY = 'rule';
const NO_MATCHED_ORG_UNITS: number[] = [];

type UseRuleMatchedOrgUnitsArgs = {
    matchingCriteria: MetricTypeCriterion[];
    dataLayerYears?: Record<string, number>;
};

export type RuleMatchedOrgUnits = {
    // Org units matched by the criteria alone, independent of any
    // handpicks/exclusions. Undefined until the first result arrives.
    ruleMatchedIds: number[] | undefined;
    // Org units matched by each metric's criteria alone, keyed by metric type id.
    matchedIdsByMetric: Record<string, number[]> | undefined;
    isAwaitingFirstResult: boolean;
    isLoading: boolean;
};

const buildPreviewRules = (
    matchingCriteria: MetricTypeCriterion[],
): ScenarioRulePreviewRequest => {
    const ruleJsonLogic = matchingCriteriaToJsonLogic(matchingCriteria);
    if (!ruleJsonLogic) {
        return {};
    }
    const metricJsonLogics = mapValues(
        groupBy(matchingCriteria, 'metric_type'),
        matchingCriteriaToJsonLogic,
    );
    return {
        ...(pickBy(metricJsonLogics) as ScenarioRulePreviewRequest),
        [RULE_KEY]: ruleJsonLogic,
    };
};

export const useRuleMatchedOrgUnits = ({
    matchingCriteria,
    dataLayerYears,
}: UseRuleMatchedOrgUnitsArgs): RuleMatchedOrgUnits => {
    const queryClient = useQueryClient();
    const rules = useMemo(
        () => buildPreviewRules(matchingCriteria),
        [matchingCriteria],
    );
    const [debouncedRules] = useDebounce(rules, DEBOUNCE_MS);
    const isCached =
        queryClient.getQueryData(
            getPreviewScenarioRuleQueryKey(rules, dataLayerYears),
        ) !== undefined;
    const skipDebounce = isEmpty(rules) || isCached;

    const { data, isFetching } = usePreviewScenarioRule(
        skipDebounce ? rules : debouncedRules,
        dataLayerYears,
    );

    const matchedIdsByMetric = useMemo(
        () => data && omit(data, RULE_KEY),
        [data],
    );

    return {
        ruleMatchedIds: data && (data[RULE_KEY] ?? NO_MATCHED_ORG_UNITS),
        matchedIdsByMetric,
        isAwaitingFirstResult:
            matchingCriteria.length > 0 && data === undefined,
        isLoading: isFetching,
    };
};
