import { MetricValue } from '../../dataLayers/types/metrics';

export const formatMetricValue = (metricValue?: string | number) => {
    if (metricValue === undefined || metricValue === null) return 'N/A';

    if (typeof metricValue === 'number') {
        return Math.round(metricValue * 100) / 100;
    }
    return metricValue;
};

export const hasNumericMetricValue = (
    metricValue: Pick<MetricValue, 'value'>,
): boolean => Boolean(metricValue.value) || metricValue.value === 0;
