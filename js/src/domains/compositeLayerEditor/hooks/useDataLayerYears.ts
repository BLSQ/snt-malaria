import { useMemo } from 'react';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { MetricValue } from '../../dataLayers/types/metrics';

/**
 * Distinct years available per metric type, for every id in `metricTypeIds`. Feeds the "Yearly
 * values" control's `getOptions`, which — unlike a custom Flume control — can't fetch its own
 * data, so this is computed once here and handed down through `CompositeEditorContext`.
 *
 * Fetches all ids in a single request: `metric_type_id` accepts a comma-separated list.
 */
export const useDataLayerYears = (
    metricTypeIds: number[],
): Map<number, number[]> => {
    const idsKey = [...metricTypeIds].sort((a, b) => a - b).join(',');

    const { data } = useSnackQuery({
        queryKey: ['metricValues', 'byMetricTypeIds', idsKey],
        queryFn: () =>
            idsKey
                ? getRequest(`/api/metricvalues/?metric_type_id=${idsKey}`)
                : Promise.resolve([]),
        options: {
            enabled: metricTypeIds.length > 0,
            cacheTime: Infinity,
            staleTime: 1000 * 60 * 15,
            refetchOnWindowFocus: false,
        },
    });

    return useMemo(() => {
        const yearsByMetricTypeId = new Map<number, number[]>();
        const distinctByMetricTypeId = new Map<number, Set<number>>();
        metricTypeIds.forEach(metricTypeId =>
            distinctByMetricTypeId.set(metricTypeId, new Set()),
        );
        ((data ?? []) as MetricValue[]).forEach(value => {
            if (value.year == null) return;
            distinctByMetricTypeId.get(value.metric_type)?.add(value.year);
        });
        distinctByMetricTypeId.forEach((distinct, metricTypeId) => {
            yearsByMetricTypeId.set(
                metricTypeId,
                [...distinct].sort((a, b) => b - a),
            );
        });
        return yearsByMetricTypeId;
    }, [metricTypeIds, data]);
};
