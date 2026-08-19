import { useCallback, useMemo, useState } from 'react';
import { Scenario } from '../../../scenarios/types';

export const MAX_EXTRA_SLOTS = 2;

export type ExtraSlotState = {
    scenarioId: number;
    year: number;
};

export type ScenarioOption = { label: string; value: number };

const clampYear = (year: number, scenario?: Scenario): number => {
    if (!scenario) return year;
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
    const scenarioById = useMemo(() => {
        const map = new Map<number, Scenario>();
        (scenarios ?? []).forEach(scenario => map.set(scenario.id, scenario));
        return map;
    }, [scenarios]);

    const [currentYear, setCurrentYear] = useState<number | undefined>(
        undefined,
    );
    const effectiveCurrentYear =
        currentYear ?? currentScenario?.start_year ?? new Date().getFullYear();

    const [extraSlots, setExtraSlots] = useState<ExtraSlotState[]>([]);

    const scenarioOptions: ScenarioOption[] = useMemo(
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
        [],
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
            const scenario = scenarioById.get(option.value);
            return [
                ...prev,
                {
                    scenarioId: option.value,
                    year: scenario?.start_year ?? effectiveCurrentYear,
                },
            ];
        });
    }, [scenarioOptions, scenarioById, currentScenario, effectiveCurrentYear]);

    const handleRemoveSlot = useCallback((index: number) => {
        setExtraSlots(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleSlotScenarioChange = useCallback(
        (index: number) => (_key: string, value: unknown) => {
            const scenarioId = Number(value);
            const scenario = scenarioById.get(scenarioId);
            setExtraSlots(prev => {
                const next = [...prev];
                const previousYear = next[index]?.year;
                next[index] = {
                    scenarioId,
                    year: clampYear(
                        previousYear ?? scenario?.start_year ?? effectiveCurrentYear,
                        scenario,
                    ),
                };
                return next;
            });
        },
        [scenarioById, effectiveCurrentYear],
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
        [],
    );

    const yearOptionsFor = useCallback(
        (scenarioId?: number) => {
            const scenario = scenarioId
                ? scenarioById.get(scenarioId)
                : undefined;
            if (!scenario) {
                return [];
            }
            const years: { label: string; value: number }[] = [];
            for (let year = scenario.start_year; year <= scenario.end_year; year += 1) {
                years.push({ label: String(year), value: year });
            }
            return years;
        },
        [scenarioById],
    );

    return {
        currentYear: effectiveCurrentYear,
        extraSlots,
        scenarioOptions,
        optionsForSlot,
        yearOptionsFor,
        handleCurrentYearChange,
        handleAddSlot,
        handleRemoveSlot,
        handleSlotScenarioChange,
        handleSlotYearChange,
        canAddSlot: extraSlots.length < MAX_EXTRA_SLOTS,
    };
};
