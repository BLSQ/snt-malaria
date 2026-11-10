import { describe, expect, it } from 'vitest';
import { labelledYears, labelStride } from './yearSelection';

describe('labelStride', () => {
    it('labels every year when they fit', () => {
        expect(labelStride(456, 7)).toBe(1);
    });

    it('skips years when labels would overlap', () => {
        expect(labelStride(360, 11)).toBe(2);
        expect(labelStride(360, 26)).toBe(4);
    });

    it('labels every year before the track is measured', () => {
        expect(labelStride(0, 11)).toBe(1);
    });
});

describe('labelledYears', () => {
    it('lists every Nth year from the first year', () => {
        expect(labelledYears([2024, 2030], 1)).toEqual([
            2024, 2025, 2026, 2027, 2028, 2029, 2030,
        ]);
        expect(labelledYears([2024, 2030], 3)).toEqual([2024, 2027, 2030]);
    });

    it('handles a single-year range', () => {
        expect(labelledYears([2026, 2026], 1)).toEqual([2026]);
    });
});
