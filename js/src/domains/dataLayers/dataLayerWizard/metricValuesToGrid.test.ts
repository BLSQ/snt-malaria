import { describe, expect, it } from 'vitest';
import { currentYear } from '../../../constants/shared';
import { MetricValue } from '../types/metrics';
import { metricValuesToGrid } from './metricValuesToGrid';

const metricValue = (partial: Partial<MetricValue>): MetricValue => ({
    id: 1,
    metric_type: 1,
    org_unit: 1,
    year: null,
    value: 0,
    string_value: '',
    ...partial,
});

describe('metricValuesToGrid', () => {
    it('buckets timeless values under the current year', () => {
        const grid = metricValuesToGrid([
            metricValue({ org_unit: 1, year: null, value: 42 }),
        ]);
        expect(grid.years).toEqual([currentYear]);
        expect(grid.values[1][currentYear]).toBe('42');
    });

    it('buckets values by their own year when present', () => {
        const grid = metricValuesToGrid([
            metricValue({ org_unit: 1, year: 2023, value: 10 }),
            metricValue({ org_unit: 1, year: 2024, value: 20 }),
            metricValue({ org_unit: 2, year: 2023, value: 30 }),
        ]);
        expect(grid.years).toEqual([2023, 2024]);
        expect(grid.values[1]).toEqual({ 2023: '10', 2024: '20' });
        expect(grid.values[2]).toEqual({ 2023: '30' });
    });

    it('falls back to string_value when value is not numeric', () => {
        const grid = metricValuesToGrid([
            metricValue({
                org_unit: 1,
                year: 2024,
                value: null as unknown as number,
                string_value: 'seasonal',
            }),
        ]);
        expect(grid.values[1][2024]).toBe('seasonal');
    });

    it('returns an empty grid for no metric values', () => {
        expect(metricValuesToGrid(undefined)).toEqual({
            values: {},
            years: [],
        });
    });
});
