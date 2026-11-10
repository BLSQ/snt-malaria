export const YEAR_LABEL_WIDTH = 48;

export const labelStride = (trackWidth: number, yearCount: number): number => {
    if (yearCount <= 1 || trackWidth <= 0) return 1;
    const stepWidth = trackWidth / (yearCount - 1);
    return Math.max(1, Math.ceil(YEAR_LABEL_WIDTH / stepWidth));
};

export const labelledYears = (
    [minYear, maxYear]: [number, number],
    stride: number,
): number[] => {
    const years: number[] = [];
    for (let year = minYear; year <= maxYear; year += stride) {
        years.push(year);
    }
    return years;
};
