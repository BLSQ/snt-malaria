import { useEffect, useMemo, useState } from 'react';
import { useComparisonDataContext } from '../ComparisonDataContext';
import { MetricKey } from '../types';
import { getAvailableMetrics } from '../utils/divergingScale';
import { useMetricConfig } from '../utils/metricConfig';

type MetricOption = { label: string; value: MetricKey };

type MetricSelection = {
    selectedMetric: MetricKey;
    setSelectedMetric: (metric: MetricKey) => void;
    metricOptions: MetricOption[];
};

/**
 * Metric dropdown state for comparison widgets. Options are limited to the
 * metrics present in the loaded data, and the selection falls back to the
 * first available option when the current one has no data.
 */
export const useMetricSelection = (
    defaultMetric?: MetricKey,
): MetricSelection => {
    const { impactsByScenarioId, budgetsByScenarioId } =
        useComparisonDataContext();
    const config = useMetricConfig();

    const [selectedMetric, setSelectedMetric] = useState<MetricKey>(
        () => defaultMetric ?? (Object.keys(config)[0] as MetricKey),
    );

    const availableMetrics = useMemo(
        () => getAvailableMetrics(impactsByScenarioId, budgetsByScenarioId),
        [impactsByScenarioId, budgetsByScenarioId],
    );

    const metricOptions = useMemo(() => {
        const allOptions = (Object.keys(config) as MetricKey[]).map(key => ({
            label: config[key].label,
            value: key,
        }));
        // Keep all options visible until data has loaded so the dropdown isn't briefly empty.
        if (availableMetrics.size === 0) return allOptions;
        return allOptions.filter(option => availableMetrics.has(option.value));
    }, [config, availableMetrics]);

    useEffect(() => {
        if (availableMetrics.size === 0) return;
        if (availableMetrics.has(selectedMetric)) return;
        const fallback = metricOptions[0]?.value;
        if (fallback && fallback !== selectedMetric) {
            setSelectedMetric(fallback);
        }
    }, [availableMetrics, selectedMetric, metricOptions]);

    return { selectedMetric, setSelectedMetric, metricOptions };
};
