/**
 * Naive pluralization for user-provided labels (e.g. cost unit names):
 * appends an "s" unless the value is exactly 1.
 */
export const pluralize = (label: string, value: number): string =>
    value === 1 ? label : `${label}s`;
