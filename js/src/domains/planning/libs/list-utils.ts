/**
 * Sorts an array of objects by a string property.
 * @param items The array to sort.
 * @param prop The property name to sort by.
 * @param order 'asc' for ascending, 'desc' for descending (default: 'asc').
 */
export const sortByStringProp = <T>(
    items: T[],
    prop: string,
    order: 'asc' | 'desc' = 'asc',
): T[] => {
    return [...items].sort((a, b) => {
        const aVal = getValue(a, prop).toLowerCase();
        const bVal = getValue(b, prop).toLowerCase();
        return order === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
    });
};

const getValue = (obj: any, path: string): string =>
    path.split('.').reduce((acc, part) => acc?.[part], obj) ?? '';
