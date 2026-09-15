import { useCallback, useMemo } from 'react';
import { DropdownOptions, useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../messages';
import { Scenario } from '../../../scenarios/types';
import { usePlanningContext } from '../../contexts/PlanningContext';

export const MAX_EXTRA_SLOTS = 2;
// Total slots shown at once: the current scenario (always slot 0) plus up to
// MAX_EXTRA_SLOTS comparison slots. `useScenarioComparisonData.ts` and
// `BudgetByInterventionWidget.tsx` can't loop this (React's rules of hooks
// forbid a variable number of hook calls), so they each hardcode 3 fixed
// slot-indexed hook calls -- the assertions there catch a `MAX_EXTRA_SLOTS`
// change that isn't reflected in those hardcoded calls.
export const MAX_SLOTS = MAX_EXTRA_SLOTS + 1;

// Sentinel year meaning "aggregate every year of the scenario" rather than a
// single calendar year. 0 is safe: no scenario spans year 0.
export const ALL_YEARS = 0;

export const isAllYears = (year: number): boolean => year === ALL_YEARS;

export type ExtraSlotState = {
    scenarioId: number;
    year: number;
};

const clampYear = (year: number, scenario?: Scenario): number => {
    if (isAllYears(year) || !scenario) return year;
    return Math.min(Math.max(year, scenario.start_year), scenario.end_year);
};

/**
 * Manages the scenario+year selection state for the Comparison tab's slots:
 * slot 0 is always the Planning page's current scenario (only its year is
 * selectable), and up to `MAX_EXTRA_SLOTS` further slots each pick their own
 * scenario and year independently.
 */
export const useComparisonSlots = (
    currentScenario: Scenario | undefined,
    scenarios: Scenario[] | undefined,
) => {
    const { formatMessage } = useSafeIntl();

    const scenarioById = useMemo(() => {
        const map = new Map<number, Scenario>();
        (scenarios ?? []).forEach(scenario => map.set(scenario.id, scenario));
        return map;
    }, [scenarios]);

    const {
        comparisonCurrentYear: currentYear,
        setComparisonCurrentYear: setCurrentYear,
        comparisonExtraSlots: extraSlots,
        setComparisonExtraSlots: setExtraSlots,
    } = usePlanningContext();
    const effectiveCurrentYear = currentYear ?? ALL_YEARS;

    const scenarioOptions: DropdownOptions<number>[] = useMemo(
        () =>
            (scenarios ?? []).map(scenario => ({
                label: scenario.name,
                value: scenario.id,
            })),
        [scenarios],
    );

    const usedScenarioIds = useMemo(
        () => new Set(extraSlots.map(slot => slot.scenarioId)),
        [extraSlots],
    );

    // Whether any scenario is left to assign to a new slot -- without this,
    // `canAddSlot` would stay true purely from slot count even when every
    // scenario is already in use, rendering an "Add scenario" button that
    // silently does nothing when clicked.
    const hasAvailableScenario = useMemo(() => {
        const used = new Set([currentScenario?.id, ...usedScenarioIds]);
        return scenarioOptions.some(option => !used.has(option.value));
    }, [scenarioOptions, currentScenario, usedScenarioIds]);

    const optionsForSlot = useCallback(
        (index: number) =>
            scenarioOptions.filter(
                option =>
                    option.value === extraSlots[index]?.scenarioId ||
                    !usedScenarioIds.has(option.value),
            ),
        [scenarioOptions, usedScenarioIds, extraSlots],
    );

    const handleCurrentYearChange = useCallback(
        (_key: string, value: unknown) => {
            setCurrentYear(Number(value));
        },
        [setCurrentYear],
    );

    const handleAddSlot = useCallback(() => {
        setExtraSlots(prev => {
            if (prev.length >= MAX_EXTRA_SLOTS) {
                return prev;
            }
            const used = new Set([
                currentScenario?.id,
                ...prev.map(slot => slot.scenarioId),
            ]);
            const option = scenarioOptions.find(o => !used.has(o.value));
            if (!option) {
                return prev;
            }
            return [...prev, { scenarioId: option.value, year: ALL_YEARS }];
        });
    }, [scenarioOptions, currentScenario, setExtraSlots]);

    const handleRemoveSlot = useCallback(
        (index: number) => {
            setExtraSlots(prev => prev.filter((_, i) => i !== index));
        },
        [setExtraSlots],
    );

    const handleSlotScenarioChange = useCallback(
        (index: number) => (_key: string, value: unknown) => {
            const scenarioId = Number(value);
            const scenario = scenarioById.get(scenarioId);
            setExtraSlots(prev => {
                const next = [...prev];
                const previousYear = next[index]?.year;
                next[index] = {
                    scenarioId,
                    year: clampYear(previousYear ?? ALL_YEARS, scenario),
                };
                return next;
            });
        },
        [scenarioById, setExtraSlots],
    );

    const handleSlotYearChange = useCallback(
        (index: number) => (_key: string, value: unknown) => {
            setExtraSlots(prev => {
                if (!prev[index]) {
                    return prev;
                }
                const next = [...prev];
                next[index] = { ...next[index], year: Number(value) };
                return next;
            });
        },
        [setExtraSlots],
    );

    // Slot 0's scenario comes from `currentScenario` (the Planning page's own
    // `useGetScenario`), a separate query from the one that populates
    // `scenarioById` (`useGetScenarios`) -- falling back to it here avoids a
    // window where slot 0 already shows a selected year but `scenarioById`
    // hasn't resolved yet, leaving the dropdown with no options for an
    // already-selected value.
    const resolveScenario = useCallback(
        (scenarioId?: number): Scenario | undefined => {
            if (scenarioId == null) return undefined;
            if (scenarioId === currentScenario?.id) return currentScenario;
            return scenarioById.get(scenarioId);
        },
        [scenarioById, currentScenario],
    );

    const yearOptionsFor = useCallback(
        (scenarioId?: number) => {
            const scenario = resolveScenario(scenarioId);
            if (!scenario) {
                return [];
            }
            const years: { label: string; value: number }[] = [
                {
                    label: formatMessage(MESSAGES.comparisonAllYears),
                    value: ALL_YEARS,
                },
            ];
            for (
                let year = scenario.start_year;
                year <= scenario.end_year;
                year += 1
            ) {
                years.push({ label: String(year), value: year });
            }
            return years;
        },
        [resolveScenario, formatMessage],
    );

    return {
        currentYear: effectiveCurrentYear,
        extraSlots,
        optionsForSlot,
        yearOptionsFor,
        handleCurrentYearChange,
        handleAddSlot,
        handleRemoveSlot,
        handleSlotScenarioChange,
        handleSlotYearChange,
        canAddSlot: extraSlots.length < MAX_EXTRA_SLOTS && hasAvailableScenario,
    };
};
