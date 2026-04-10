import { useEffect } from 'react';
import { useQueryClient } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';

const PREFETCH_INTERVAL_MS = 50;
const PREFETCH_YEARS = 2;

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

        const years: [number, number][] = [];
        for (let d = 1; d <= PREFETCH_YEARS; d++) {
            for (const [f, t] of [
                [yearFrom + d, yearTo],
                [yearFrom - d, yearTo],
                [yearFrom, yearTo + d],
                [yearFrom, yearTo - d],
            ] as [number, number][]) {
                if (f >= min && t <= max && f <= t) {
                    years.push([f, t]);
                }
            }
        }

        const timers: ReturnType<typeof setTimeout>[] = [];
        let index = 0;

        for (const scenarioId of scenarioIds) {
            for (const [from, to] of years) {
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
