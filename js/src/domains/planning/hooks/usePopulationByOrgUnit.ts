import { useMemo } from 'react';
import { useGetMetricValues } from '../../dataLayers/hooks/useGetMetrics';
import { usePlanningContext } from '../contexts/PlanningContext';

// Fallback: SNT convention code used when no default_population_id is configured.
const POPULATION_METRIC_CODE = 'POPULATION';

type PopulationByOrgUnit = {
    // org unit id -> total population for the picked year. `undefined` while
    // loading or when the account has no POPULATION layer, so callers can
    // distinguish "no data" from "population of 0".
    populationByOrgUnit?: Map<number, number>;
    // The year the populations were taken from, or `null` for a time-invariant
    // (`year: null`) snapshot.
    year: number | null;
};

type Props = {
    // When provided, this metric type is used directly instead of looking up
    // by the POPULATION code convention. Comes from account_settings.default_population_id.
    metricTypeId?: number | null;
};

/**
 * Returns the per-org-unit total population from the configured population data
 * layer, plus the year it was taken from. When `metricTypeId` is provided it is
 * used directly; otherwise the hook falls back to the account's metric type with
 * code POPULATION. A single target year is used for every org unit: the year
 * closest to the current year that *every* org unit has data for, so the
 * populations are always comparable and no org unit is silently dropped. Rows
 * with `year: null` (a time-invariant snapshot) are only used when there is no
 * such common dated year.
 */
export const usePopulationByOrgUnit = ({
    metricTypeId,
}: Props = {}): PopulationByOrgUnit => {
    const { metricTypeCategories } = usePlanningContext();

    const resolvedMetricTypeId = useMemo(
        () =>
            metricTypeId != null
                ? metricTypeId
                : metricTypeCategories
                      .flatMap(category => category.items)
                      .find(
                          metricType =>
                              metricType.code === POPULATION_METRIC_CODE,
                      )?.id,
        [metricTypeId, metricTypeCategories],
    );

    const { data: metricValues } = useGetMetricValues({
        metricTypeId: resolvedMetricTypeId,
    });

    return useMemo(() => {
        if (!resolvedMetricTypeId || !metricValues) {
            return { populationByOrgUnit: undefined, year: null };
        }
        const currentYear = new Date().getFullYear();

        // Count how many org units have data for each year. (org_unit, year)
        // is unique per metric type, so each row counts at most once.
        const orgUnitsWithData = new Set<number>();
        const orgUnitCountByYear = new Map<number, number>();
        metricValues.forEach(({ org_unit, year, value }) => {
            if (value == null || year == null) {
                return;
            }
            orgUnitsWithData.add(org_unit);
            orgUnitCountByYear.set(
                year,
                (orgUnitCountByYear.get(year) ?? 0) + 1,
            );
        });

        // Target year = the year closest to now that every org unit shares.
        // A tie (a past and a future year equally far from now) prefers the
        // past year, since future years are projections. Stays null when there
        // is no common dated year (then we fall back to the time-invariant
        // `year: null` snapshot below).
        let targetYear: number | null = null;
        orgUnitCountByYear.forEach((count, year) => {
            if (count !== orgUnitsWithData.size) {
                return;
            }
            if (targetYear === null) {
                targetYear = year;
                return;
            }
            const distance = Math.abs(year - currentYear);
            const targetDistance = Math.abs(targetYear - currentYear);
            if (
                distance < targetDistance ||
                (distance === targetDistance && year < targetYear)
            ) {
                targetYear = year;
            }
        });

        const populationByOrgUnit = new Map<number, number>();
        metricValues.forEach(({ org_unit, year, value }) => {
            if (value != null && year === targetYear) {
                populationByOrgUnit.set(org_unit, value);
            }
        });
        return { populationByOrgUnit, year: targetYear };
    }, [resolvedMetricTypeId, metricValues]);
};
