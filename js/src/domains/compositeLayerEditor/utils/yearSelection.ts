/**
 * The composite editor lives on the standalone data-layers page, with no scenario (and thus no
 * account-level reference year) in context. So previews default to the year closest to the current
 * year, which is the most useful standalone default; ties favour the more recent year.
 */
export const closestYearToCurrent = (years: number[]): number | undefined => {
    if (years.length === 0) return undefined;
    const currentYear = new Date().getFullYear();
    return years.reduce((best, year) => {
        const bestDistance = Math.abs(best - currentYear);
        const yearDistance = Math.abs(year - currentYear);
        if (yearDistance < bestDistance) return year;
        if (yearDistance === bestDistance && year > best) return year;
        return best;
    });
};

/**
 * Resolve which year a preview should show: keep the user's current pick if it's still available,
 * otherwise fall back to the year closest to the current year.
 */
export const resolveSelectedYear = (
    years: number[],
    previous?: number,
): number | undefined =>
    previous != null && years.includes(previous)
        ? previous
        : closestYearToCurrent(years);
