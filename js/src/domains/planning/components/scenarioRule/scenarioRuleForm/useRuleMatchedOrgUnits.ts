import { useMemo } from 'react';
import { useDebounce } from 'bluesquare-components';
import { useQueryClient } from 'react-query';
import {
    getPreviewScenarioRuleQueryKey,
    usePreviewScenarioRule,
} from '../../../hooks/usePreviewScenarioRule';
import { MetricTypeCriterion } from '../../../types/scenarioRule';
import { matchingCriteriaToJsonLogic } from '../../../utils/jsonLogic';

const DEBOUNCE_MS = 500;

type UseRuleMatchedOrgUnitsArgs = {
    matchingCriteria: MetricTypeCriterion[];
    dataLayerYears?: Record<string, number>;
};

export type RuleMatchedOrgUnits = {
    // Org units matched by the criteria alone, independent of any
    // handpicks/exclusions. Undefined until the first result arrives.
    ruleMatchedIds: number[] | undefined;
    // Criteria `ruleMatchedIds` was computed for; lags while a request is pending.
    matchedCriteria: MetricTypeCriterion[] | undefined;
    isAwaitingFirstResult: boolean;
    isLoading: boolean;
};

export const useRuleMatchedOrgUnits = ({
    matchingCriteria,
    dataLayerYears,
}: UseRuleMatchedOrgUnitsArgs): RuleMatchedOrgUnits => {
    const queryClient = useQueryClient();
    const [debouncedCriteria] = useDebounce(matchingCriteria, DEBOUNCE_MS);

    const jsonLogic = useMemo(
        () => matchingCriteriaToJsonLogic(matchingCriteria),
        [matchingCriteria],
    );
    const debouncedJsonLogic = useMemo(
        () => matchingCriteriaToJsonLogic(debouncedCriteria),
        [debouncedCriteria],
    );
    const isCached =
        queryClient.getQueryData(
            getPreviewScenarioRuleQueryKey(jsonLogic, dataLayerYears),
        ) !== undefined;
    const skipDebounce = matchingCriteria.length === 0 || isCached;

    const { data, isFetching } = usePreviewScenarioRule(
        skipDebounce ? matchingCriteria : debouncedCriteria,
        skipDebounce ? jsonLogic : debouncedJsonLogic,
        dataLayerYears,
    );

    return {
        ruleMatchedIds: data?.ids,
        matchedCriteria: data?.criteria,
        isAwaitingFirstResult:
            matchingCriteria.length > 0 && data === undefined,
        isLoading: isFetching,
    };
};
