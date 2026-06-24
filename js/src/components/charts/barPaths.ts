// SVG path builders for recharts custom bar shapes. Kept here so the summary
// charts can share them instead of redefining the same geometry per chart.

/**
 * Rectangle with rounded top corners and square bottom corners, so vertical
 * bars sit flush on the axis baseline.
 */
export const roundedTopRectPath = (
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
): string => {
    const r = Math.max(0, Math.min(radius, width / 2, height));
    return [
        `M${x},${y + height}`,
        `L${x},${y + r}`,
        `Q${x},${y} ${x + r},${y}`,
        `L${x + width - r},${y}`,
        `Q${x + width},${y} ${x + width},${y + r}`,
        `L${x + width},${y + height}`,
        'Z',
    ].join(' ');
};

/**
 * Same as {@link roundedTopRectPath} but left open at the bottom, so an outline
 * (e.g. a target envelope) has no line along the baseline.
 */
export const roundedTopOutlinePath = (
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
): string => {
    const r = Math.max(0, Math.min(radius, width / 2, height));
    return [
        `M${x},${y + height}`,
        `L${x},${y + r}`,
        `Q${x},${y} ${x + r},${y}`,
        `L${x + width - r},${y}`,
        `Q${x + width},${y} ${x + width},${y + r}`,
        `L${x + width},${y + height}`,
    ].join(' ');
};

/**
 * Rectangle with only its right corners rounded, so the outer end of a
 * horizontal bar is rounded while it stays flush with the value axis.
 */
export const roundedRightRectPath = (
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
): string => {
    const r = Math.max(0, Math.min(radius, width, height / 2));
    return [
        `M${x},${y}`,
        `L${x + width - r},${y}`,
        `Q${x + width},${y} ${x + width},${y + r}`,
        `L${x + width},${y + height - r}`,
        `Q${x + width},${y + height} ${x + width - r},${y + height}`,
        `L${x},${y + height}`,
        'Z',
    ].join(' ');
};
