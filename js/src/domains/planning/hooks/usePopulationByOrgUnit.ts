import { useMemo } from 'react';
import { useGetMetricValues } from '../../dataLayers/hooks/useGetMetrics';
import { usePlanningContext } from '../contexts/PlanningContext';

// SNT convention: the data layer holding total population values has this
// MetricType code (see fixtures and demo account seeding).
const POPULATION_METRIC_CODE = 'POPULATION';

/**
 * Returns a map of org unit id -> total population, based on the account's
 * POPULATION data layer. When an org unit has values for several years, the
 * latest year wins; rows with `year: null` act as a time-invariant fallback
 * (mirroring the backend logic in providers/impact/fake.py).
 *
 * Returns `undefined` while loading or when the account has no POPULATION
 * layer, so callers can distinguish "no data" from "population of 0".
 */
export const usePopulationByOrgUnit = (): Map<number, number> | undefined => {
    const { metricTypeCategories } = usePlanningContext();

    const populationMetricType = useMemo(
        () =>
            metricTypeCategories
                .flatMap(category => category.items)
                .find(metricType => metricType.code === POPULATION_METRIC_CODE),
        [metricTypeCategories],
    );

    const { data: metricValues } = useGetMetricValues({
        metricTypeId: populationMetricType?.id,
    });

    return useMemo(() => {
        if (!populationMetricType || !metricValues) {
            return undefined;
        }
        const bestYearByOrgUnit = new Map<number, number>();
        const populationByOrgUnit = new Map<number, number>();
        metricValues.forEach(metricValue => {
            if (metricValue.value == null) {
                return;
            }
            const yearKey = metricValue.year ?? Number.NEGATIVE_INFINITY;
            const bestYear = bestYearByOrgUnit.get(metricValue.org_unit);
            if (bestYear === undefined || yearKey > bestYear) {
                bestYearByOrgUnit.set(metricValue.org_unit, yearKey);
                populationByOrgUnit.set(
                    metricValue.org_unit,
                    metricValue.value,
                );
            }
        });
        return populationByOrgUnit;
    }, [populationMetricType, metricValues]);
};
