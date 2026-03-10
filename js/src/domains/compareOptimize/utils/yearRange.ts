/** Returns the intersection of two year ranges, or undefined if they don't overlap. */
export const intersectYearRanges = (
    rangeA: [number, number],
    rangeB: [number, number],
): [number, number] | undefined => {
    const [aStart, aEnd] = rangeA;
    const [bStart, bEnd] = rangeB;
    const start = Math.max(aStart, bStart);
    const end = Math.min(aEnd, bEnd);
    return start <= end ? [start, end] : undefined;
};
