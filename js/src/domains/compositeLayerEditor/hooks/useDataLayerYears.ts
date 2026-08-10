import { useMemo } from 'react';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQueries } from 'Iaso/libs/apiHooks';
import { MetricValue } from '../../dataLayers/types/metrics';

/**
 * Distinct years available per metric type, for every id in `metricTypeIds`. Feeds the "Yearly
 * values" control's `getOptions`, which — unlike a custom Flume control — can't fetch its own
 * data, so this is computed once here and handed down through `CompositeEditorContext`.
 *
 * Shares its cache with `useGetMetricValues({ metricTypeId })` (same query key shape), so a node's
 * own map preview doesn't re-fetch what this hook already loaded, and vice versa.
 */
export const useDataLayerYears = (
    metricTypeIds: number[],
): Map<number, number[]> => {
    const results = useSnackQueries(
        metricTypeIds.map(metricTypeId => ({
            queryKey: ['metricValues', metricTypeId, undefined, undefined],
            queryFn: () =>
                getRequest(`/api/metricvalues/?metric_type_id=${metricTypeId}`),
            options: {
                cacheTime: Infinity,
                staleTime: 1000 * 60 * 15,
                refetchOnWindowFocus: false,
            },
        })),
    );

    return useMemo(() => {
        const yearsByMetricTypeId = new Map<number, number[]>();
        metricTypeIds.forEach((metricTypeId, index) => {
            const values = (results[index]?.data ?? []) as MetricValue[];
            const distinct = new Set<number>();
            values.forEach(value => {
                if (value.year != null) distinct.add(value.year);
            });
            yearsByMetricTypeId.set(
                metricTypeId,
                [...distinct].sort((a, b) => b - a),
            );
        });
        return yearsByMetricTypeId;
    }, [metricTypeIds, results]);
};
