/** Returns the intersection of two year ranges, or undefined if they don't overlap. */
export const intersectYearRanges = (
    a: [number, number],
    b: [number, number],
): [number, number] | undefined => {
    const [aStart, aEnd] = a;
    const [bStart, bEnd] = b;
    const start = Math.max(aStart, bStart);
    const end = Math.min(aEnd, bEnd);
    return start <= end ? [start, end] : undefined;
};
