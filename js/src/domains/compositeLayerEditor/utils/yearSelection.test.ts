import { closestYearToCurrent, resolveSelectedYear } from './yearSelection';

describe('closestYearToCurrent', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-15'));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns undefined for an empty list', () => {
        expect(closestYearToCurrent([])).toBe(undefined);
    });

    it('picks the year closest to the current year', () => {
        expect(closestYearToCurrent([2020, 2023, 2030])).toBe(2023);
    });

    it('picks the exact current year when present', () => {
        expect(closestYearToCurrent([2022, 2024, 2026])).toBe(2024);
    });

    it('breaks a tie in favour of the more recent year', () => {
        // 2022 and 2026 are both 2 years away from 2024.
        expect(closestYearToCurrent([2022, 2026])).toBe(2026);
    });

    it('handles a single-year list', () => {
        expect(closestYearToCurrent([1999])).toBe(1999);
    });
});

describe('resolveSelectedYear', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-15'));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('keeps the previous pick if it is still available', () => {
        expect(resolveSelectedYear([2020, 2021, 2022], 2020)).toBe(2020);
    });

    it('falls back to the closest-to-current year when the previous pick is gone', () => {
        expect(resolveSelectedYear([2020, 2023], 2021)).toBe(2023);
    });

    it('falls back to the closest-to-current year when there is no previous pick', () => {
        expect(resolveSelectedYear([2020, 2023])).toBe(2023);
    });
});
