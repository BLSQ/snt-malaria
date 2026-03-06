import { useCallback, useEffect, useMemo, useState } from 'react';
import { Scenario } from '../../scenarios/types';
import { ScenarioId, ScenarioOption } from '../types';
import { MAX_COMPARISONS } from '../utils/constants';

/**
 * Manages scenario selection state for the compare-and-optimize page.
 *
 * Provides a baseline scenario selector and up to `MAX_COMPARISONS`
 * comparison slots. Comparison ids are automatically normalized whenever
 * the baseline changes so that no slot duplicates the baseline or another slot.
 */
export const useScenarioSelections = (scenarios?: Scenario[]) => {
    const [baselineScenarioId, setBaselineScenarioId] = useState<ScenarioId>('');
    const [comparisonScenarioIds, setComparisonScenarioIds] = useState<
        ScenarioId[]
    >([]);

    const scenarioOptions: ScenarioOption[] = useMemo(
        () =>
            scenarios?.map(scenario => ({
                label: scenario.name,
                value: scenario.id,
            })) ?? [],
        [scenarios],
    );

    const comparisonOptions: ScenarioOption[] = useMemo(
        () =>
            scenarioOptions.filter(
                option => option.value !== baselineScenarioId,
            ),
        [scenarioOptions, baselineScenarioId],
    );

    /**
     * Re-validates a list of comparison ids against the currently available
     * options, replacing invalid or duplicate entries with the next available
     * option and capping the result at `MAX_COMPARISONS`.
     */
    const normalizeComparisonIds = useCallback(
        (ids: ScenarioId[]) => {
            const available = comparisonOptions.map(option => option.value);
            const used = new Set<number>();
            const normalized: number[] = [];
            ids.forEach(id => {
                const numericId = typeof id === 'number' ? id : undefined;
                const isValid =
                    numericId !== undefined &&
                    available.includes(numericId) &&
                    !used.has(numericId);
                if (isValid) {
                    normalized.push(numericId);
                    used.add(numericId);
                    return;
                }
                const replacement = available.find(
                    optionId => !used.has(optionId),
                );
                if (replacement !== undefined) {
                    normalized.push(replacement);
                    used.add(replacement);
                }
            });
            return normalized.slice(0, MAX_COMPARISONS);
        },
        [comparisonOptions],
    );

    useEffect(() => {
        if (scenarios && scenarios.length > 0 && baselineScenarioId === '') {
            setBaselineScenarioId(scenarios[0].id);
        }
    }, [scenarios, baselineScenarioId]);

    useEffect(() => {
        if (comparisonOptions.length === 0) {
            setComparisonScenarioIds([]);
            return;
        }
        setComparisonScenarioIds(prev => normalizeComparisonIds(prev));
    }, [baselineScenarioId, comparisonOptions, normalizeComparisonIds]);

    const handleBaselineSelect = useCallback(
        (_key: string, value: unknown) => {
            setBaselineScenarioId(value as number);
        },
        [],
    );

    const handleComparisonSelect = useCallback(
        (index: number) => (_key: string, value: unknown) => {
            setComparisonScenarioIds(prev => {
                const next = [...prev];
                next[index] = value as ScenarioId;
                return normalizeComparisonIds(next);
            });
        },
        [normalizeComparisonIds],
    );

    const handleAddComparison = useCallback(() => {
        setComparisonScenarioIds(prev => {
            if (prev.length >= MAX_COMPARISONS) {
                return prev;
            }
            const next = normalizeComparisonIds(prev);
            const available = comparisonOptions.map(option => option.value);
            const used = new Set(next);
            const replacement = available.find(id => !used.has(id));
            if (replacement === undefined) {
                return next;
            }
            return [...next, replacement].slice(0, MAX_COMPARISONS);
        });
    }, [comparisonOptions, normalizeComparisonIds]);

    const handleRemoveComparison = useCallback((index: number) => {
        setComparisonScenarioIds(prev => prev.filter((_, i) => i !== index));
    }, []);

    return {
        baselineScenarioId,
        comparisonScenarioIds,
        scenarioOptions,
        comparisonOptions,
        handleBaselineSelect,
        handleComparisonSelect,
        handleAddComparison,
        handleRemoveComparison,
    };
};
