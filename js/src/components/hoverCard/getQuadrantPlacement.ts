export type Point = { x: number; y: number };

export type QuadrantPlacement =
    | 'top-start'
    | 'top-end'
    | 'bottom-start'
    | 'bottom-end';

// How far the pointer must move past the country's centre before the card switches side.
const DEAD_ZONE_PX = 30;

/** Opens the card away from the country's centre, so it covers less of the country. */
export const getQuadrantPlacement = (
    pointer: Point,
    countryRect: DOMRect,
    current?: QuadrantPlacement,
): QuadrantPlacement => {
    const centerX = countryRect.left + countryRect.width / 2;
    const centerY = countryRect.top + countryRect.height / 2;
    const opensLeft = current?.endsWith('end')
        ? pointer.x < centerX + DEAD_ZONE_PX
        : pointer.x < centerX - DEAD_ZONE_PX;
    const opensUp = current?.startsWith('top')
        ? pointer.y < centerY + DEAD_ZONE_PX
        : pointer.y < centerY - DEAD_ZONE_PX;
    return `${opensUp ? 'top' : 'bottom'}-${opensLeft ? 'end' : 'start'}`;
};
