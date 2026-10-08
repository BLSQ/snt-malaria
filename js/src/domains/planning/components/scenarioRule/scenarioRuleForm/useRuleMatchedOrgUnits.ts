import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'bluesquare-components';
import { usePreviewScenarioRule } from '../../../hooks/usePreviewScenarioRule';
import { MetricTypeCriterion } from '../../../types/scenarioRule';

const DEBOUNCE_MS = 500;

type UseRuleMatchedOrgUnitsArgs = {
    matchingCriteria: MetricTypeCriterion[];
    dataLayerYears?: Record<string, number>;
};

export type RuleMatchedOrgUnits = {
    // Org units matched by the criteria alone, independent of any
    // handpicks/exclusions. Undefined until the first result arrives.
    ruleMatchedIds: number[] | undefined;
    isAwaitingFirstResult: boolean;
    isLoading: boolean;
};

export const useRuleMatchedOrgUnits = ({
    matchingCriteria,
    dataLayerYears,
}: UseRuleMatchedOrgUnitsArgs): RuleMatchedOrgUnits => {
    const { mutate, isLoading } = usePreviewScenarioRule();
    const [ruleMatchedIds, setRuleMatchedIds] = useState<number[] | undefined>(
        undefined,
    );
    const hasRequestedFirstResult = useRef(false);

    const runPreview = useCallback(() => {
        mutate(
            {
                matching_criteria: matchingCriteria,
                data_layer_years: dataLayerYears,
            },
            {
                onSuccess: data => setRuleMatchedIds(data as number[]),
            },
        );
    }, [mutate, matchingCriteria, dataLayerYears]);

    const debouncedRunPreview = useDebouncedCallback(runPreview, DEBOUNCE_MS);

    useEffect(() => {
        if (matchingCriteria.length === 0) {
            debouncedRunPreview.cancel();
            setRuleMatchedIds([]);
            return;
        }
        if (!hasRequestedFirstResult.current) {
            hasRequestedFirstResult.current = true;
            runPreview();
            return;
        }
        debouncedRunPreview();
    }, [matchingCriteria, dataLayerYears, runPreview, debouncedRunPreview]);

    return {
        ruleMatchedIds,
        isAwaitingFirstResult:
            matchingCriteria.length > 0 && ruleMatchedIds === undefined,
        isLoading,
    };
};
