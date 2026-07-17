/**
 * Naive pluralization for user-provided labels (e.g. cost unit names):
 * appends an "s" unless the value is exactly 1 or the label already ends
 * with one (zero and fractions take the plural, as in English).
 */
export const pluralize = (label: string, value: number): string =>
    value === 1 || label.endsWith('s') ? label : `${label}s`;
