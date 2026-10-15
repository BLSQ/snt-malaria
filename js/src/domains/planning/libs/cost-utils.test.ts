import { formatCost } from './cost-utils';

describe('formatCost', () => {
    it('formats values below 1000 with two decimals', () => {
        expect(formatCost(534.2)).toBe('534.20');
    });

    it('abbreviates thousands, millions and billions', () => {
        expect(formatCost(1_500)).toBe('1.50K');
        expect(formatCost(2_345_678)).toBe('2.35M');
        expect(formatCost(3_000_000_000)).toBe('3.00B');
    });

    it('keeps the sign of negative values', () => {
        expect(formatCost(-1_500)).toBe('-1.50K');
        expect(formatCost(-42)).toBe('-42.00');
    });

    it('prefixes the currency symbol for prefix currencies', () => {
        expect(formatCost(2_345_678, 'USD')).toBe('$2.35M');
    });

    it('suffixes the currency symbol for suffix currencies', () => {
        expect(formatCost(1_500, 'EUR')).toBe('1.50K €');
    });

    it('falls back to a formatted zero when the value is zero', () => {
        expect(formatCost(0)).toBe('0');
        expect(formatCost(0, 'USD')).toBe('$0');
    });
});
