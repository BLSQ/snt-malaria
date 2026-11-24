export type Point = { x: number; y: number };

export type QuadrantPlacement =
    | 'top-start'
    | 'top-end'
    | 'bottom-start'
    | 'bottom-end';

// How far the pointer must move past the country's centre before the card switches side.
export const DEAD_ZONE_PX = 30; // DEBUG: exported for the debug overlay

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

type Size = { width: number; height: number };

/** Keeps `placement` where a card of `size` fits in the viewport, otherwise opens it the other way. */
export const fitPlacement = (
    placement: QuadrantPlacement,
    pointer: Point,
    size: Size,
    viewport: Size,
    offset: number,
): QuadrantPlacement => {
    const fitsUp = pointer.y - offset - size.height >= 0;
    const fitsDown = pointer.y + offset + size.height <= viewport.height;
    const fitsLeft = pointer.x - offset - size.width >= 0;
    const fitsRight = pointer.x + offset + size.width <= viewport.width;
    const opensUp = placement.startsWith('top')
        ? fitsUp || !fitsDown
        : !fitsDown && fitsUp;
    const opensLeft = placement.endsWith('end')
        ? fitsLeft || !fitsRight
        : !fitsRight && fitsLeft;
    return `${opensUp ? 'top' : 'bottom'}-${opensLeft ? 'end' : 'start'}`;
};
