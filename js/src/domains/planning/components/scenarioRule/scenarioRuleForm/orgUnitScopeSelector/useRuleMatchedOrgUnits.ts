import { useCallback, useEffect, useState } from 'react';
import { useDebouncedCallback } from 'bluesquare-components';
import { usePreviewScenarioRule } from '../../../../hooks/usePreviewScenarioRule';
import { MetricTypeCriterion } from '../../../../types/scenarioRule';

const DEBOUNCE_MS = 500;

type UseRuleMatchedOrgUnitsArgs = {
    matchingCriteria: MetricTypeCriterion[];
    dataLayerYears?: Record<string, number>;
};

type UseRuleMatchedOrgUnitsResult = {
    // The "by rule" set - org units matched by the criteria alone, live as
    // the user edits them, independent of any handpicks/exclusions.
    ruleMatchedIds: number[] | undefined;
    isLoading: boolean;
    isError: boolean;
    retry: () => void;
};

// Mirrors the debounced live-preview call already made one level up (in
// ScenarioRuleFormWrapper) for the *effective* scope, but always with no
// exclusions/handpicks, so it resolves to the raw "by rule" set the tree
// needs for its rule/handpicked/excluded breakdown.
export const useRuleMatchedOrgUnits = ({
    matchingCriteria,
    dataLayerYears,
}: UseRuleMatchedOrgUnitsArgs): UseRuleMatchedOrgUnitsResult => {
    const { mutate, isLoading, isError } = usePreviewScenarioRule();
    const [ruleMatchedIds, setRuleMatchedIds] = useState<number[] | undefined>(
        undefined,
    );

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
        debouncedRunPreview();
    }, [matchingCriteria, dataLayerYears, debouncedRunPreview]);

    return { ruleMatchedIds, isLoading, isError, retry: runPreview };
};
