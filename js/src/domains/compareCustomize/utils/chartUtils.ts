/**
 * D3-style "nice" step size for axis ticks (see d3-scale tickStep).
 * Thresholds ≈ √50, √10, √2 are geometric means between 10, 5, 2, 1.
 */
const niceStep = (range: number, count: number): number => {
    const raw = range / Math.max(1, count - 1);
    const mag = 10 ** Math.floor(Math.log10(raw));
    const r = raw / mag;
    if (r >= 7.07) return 10 * mag;
    if (r >= 3.16) return 5 * mag;
    if (r >= 1.41) return 2 * mag;
    return mag;
};

/**
 * Axis domain + ticks with round labels, always including 0 (baseline).
 * Recharts auto-scaling can't guarantee either, so we compute our own.
 * Adds an extra step when data reaches within 10% of a domain edge.
 */
export const computeNiceTicks = (
    data: { value: number; errorLower: number; errorUpper: number }[],
): { domain: [number, number]; ticks: number[] } => {
    if (data.length === 0) return { domain: [0, 1], ticks: [0] };

    const dataMin = Math.min(
        0,
        ...data.map((d) => d.value - d.errorLower),
    );
    const dataMax = Math.max(
        0,
        ...data.map((d) => d.value + d.errorUpper),
    );
    const step = niceStep(dataMax - dataMin || 1, 6);

    let lo = Math.floor(dataMin / step) * step;
    let hi = Math.ceil(dataMax / step) * step;

    if (dataMin < 0 && dataMin - lo < step * 0.1) lo -= step;
    if (dataMax > 0 && hi - dataMax < step * 0.1) hi += step;

    const ticks = Array.from(
        { length: Math.round((hi - lo) / step) + 1 },
        (_, i) => lo + i * step,
    );

    return { domain: [lo, hi], ticks };
};
