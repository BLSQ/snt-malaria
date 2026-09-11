import { currentYear } from '../../../constants/shared';
import { hasNumericMetricValue } from '../../planning/libs/metric-utils';
import { MetricValue } from '../types/metrics';

export type MetricValueGrid = {
    values: Record<number, Record<number, string>>;
    years: number[];
};

const metricValueText = (metricValue: MetricValue): string =>
    hasNumericMetricValue(metricValue)
        ? String(metricValue.value)
        : metricValue.string_value;

/**
 * OpenHexa imports are timeless in practice (no YEAR column in the source), so
 * `year` is usually null; fall back to the current year so the read-only grid
 * still has a column to show the value under.
 */
export const metricValuesToGrid = (
    metricValues: MetricValue[] = [],
): MetricValueGrid => {
    const values: Record<number, Record<number, string>> = {};
    const years = new Set<number>();
    metricValues.forEach(metricValue => {
        const year = metricValue.year ?? currentYear;
        years.add(year);
        values[metricValue.org_unit] ??= {};
        values[metricValue.org_unit][year] = metricValueText(metricValue);
    });
    return { values, years: Array.from(years).sort((a, b) => a - b) };
};
