import { useEffect } from 'react';
import { useQueryClient } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';

const PREFETCH_INTERVAL_MS = 50;
const PREFETCH_YEARS = 2;

/** Return years around `year` within [min, max], excluding `year` itself. */
const surroundingYears = (year: number, min: number, max: number): number[] => {
    const from = Math.max(min, year - PREFETCH_YEARS);
    const to = Math.min(max, year + PREFETCH_YEARS);
    const result: number[] = [];
    for (let i = from; i <= to; i++) {
        if (i !== year) result.push(i);
    }
    return result;
};

/**
 * Prefetch impact data for the next PREFETCH_YEARS positions on each
 * slider thumb. Since the user can only move one slider at a time,
 * this covers the next moves in any direction they choose.
 */
export const usePrefetchYearsImpact = (
    yearFrom: number | undefined,
    yearTo: number | undefined,
    yearBounds: [number, number] | undefined,
    scenarioIds: number[],
    selectedAgeGroup: string | undefined,
    isImpactLoading: boolean,
): void => {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (
            isImpactLoading ||
            yearFrom === undefined ||
            yearTo === undefined ||
            !yearBounds ||
            !selectedAgeGroup ||
            scenarioIds.length === 0
        )
            return;

        const [min, max] = yearBounds;


        const yearFromCandidates = surroundingYears(yearFrom, min, yearTo);
        const yearToCandidates = surroundingYears(yearTo, yearFrom, max);

        // The user moves one slider at a time, so pair each candidate
        // with the fixed other thumb.
        const yearsToPrefetch: [number, number][] = [
            ...yearFromCandidates.map(f => [f, yearTo] as [number, number]),
            ...yearToCandidates.map(t => [yearFrom, t] as [number, number]),
        ];

        const timers: ReturnType<typeof setTimeout>[] = [];
        let index = 0;

        for (const scenarioId of scenarioIds) {
            for (const [from, to] of yearsToPrefetch) {
                const delay = ++index * PREFETCH_INTERVAL_MS;

                timers.push(
                    setTimeout(() => {
                        const params = new URLSearchParams({
                            scenario_id: String(scenarioId),
                            year_from: String(from),
                            year_to: String(to),
                            age_group: selectedAgeGroup,
                        });

                        queryClient.prefetchQuery(
                            ['impact', scenarioId, from, to, selectedAgeGroup],
                            () =>
                                getRequest(
                                    `/api/snt_malaria/impact/?${params.toString()}`,
                                ),
                            { staleTime: Infinity, cacheTime: Infinity },
                        );
                    }, delay),
                );
            }
        }

        return () => timers.forEach(clearTimeout);
    }, [
        queryClient,
        yearFrom,
        yearTo,
        yearBounds,
        scenarioIds,
        selectedAgeGroup,
        isImpactLoading,
    ]);
};
