export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = { left: number; top: number; right: number; bottom: number };
export type Side = { up: boolean; left: boolean };

export const POINTER_OFFSET = 16;
// Another side must hide at least this share of the card area less than the current one…
const SIDE_SWITCH_MIN_GAIN = 0.35;
// …and at most this share of what the current side hides.
const SIDE_SWITCH_MAX_RATIO = 0.5;

export const DEFAULT_SIDE: Side = { up: false, left: false };
const SIDES: Side[] = [
    DEFAULT_SIDE,
    { up: false, left: true },
    { up: true, left: false },
    { up: true, left: true },
];

export const isSameSide = (a: Side | undefined, b: Side | undefined) =>
    a?.up === b?.up && a?.left === b?.left;

const getCardRect = (anchor: Point, size: Size, side: Side): Rect => {
    const left = side.left
        ? anchor.x - POINTER_OFFSET - size.width
        : anchor.x + POINTER_OFFSET;
    const top = side.up
        ? anchor.y - POINTER_OFFSET - size.height
        : anchor.y + POINTER_OFFSET;
    return { left, top, right: left + size.width, bottom: top + size.height };
};

const fitsIn = (rect: Rect, viewport: Size) =>
    rect.left >= 0 &&
    rect.top >= 0 &&
    rect.right <= viewport.width &&
    rect.bottom <= viewport.height;

export type GetCoverage = (rect: Rect) => number;

const clampInto = (rect: Rect, viewport: Size): Point => ({
    x: Math.max(
        0,
        Math.min(rect.left, viewport.width - (rect.right - rect.left)),
    ),
    y: Math.max(
        0,
        Math.min(rect.top, viewport.height - (rect.bottom - rect.top)),
    ),
});

type Placement = {
    side: Side;
    position: Point;
    /** A side whose card would cover clearly less than on `side`. */
    preferredSide?: Side;
};

/**
 * Places a card next to `anchor` on the side that fits in the viewport and covers
 * the least according to `getCoverage`. `currentSide` is kept while it still fits;
 * a side that covers clearly less is reported as `preferredSide`.
 * The side is chosen for `plannedSize`, the largest size the card can grow to,
 * so it keeps its side when it grows.
 */
export const computePlacement = ({
    anchor,
    size,
    plannedSize = size,
    viewport,
    getCoverage,
    currentSide,
}: {
    anchor: Point;
    size: Size;
    plannedSize?: Size;
    viewport: Size;
    getCoverage: GetCoverage;
    currentSide?: Side;
}): Placement => {
    const toPosition = (side: Side): Point => {
        const rect = getCardRect(anchor, size, side);
        return { x: rect.left, y: rect.top };
    };
    const candidates = SIDES.map(side => ({
        side,
        rect: getCardRect(anchor, plannedSize, side),
    }))
        .filter(({ rect }) => fitsIn(rect, viewport))
        .map(candidate => ({
            ...candidate,
            covered: getCoverage(candidate.rect),
        }));

    if (candidates.length === 0) {
        const side = currentSide ?? DEFAULT_SIDE;
        return {
            side,
            position: clampInto(getCardRect(anchor, size, side), viewport),
        };
    }

    const best = candidates.reduce((winner, candidate) =>
        candidate.covered < winner.covered ? candidate : winner,
    );
    const current = candidates.find(candidate =>
        isSameSide(candidate.side, currentSide),
    );
    if (!current) {
        return { side: best.side, position: toPosition(best.side) };
    }

    const isClearlyBetter =
        current.covered - best.covered >=
            SIDE_SWITCH_MIN_GAIN * plannedSize.width * plannedSize.height &&
        best.covered <= SIDE_SWITCH_MAX_RATIO * current.covered;
    return {
        side: current.side,
        position: toPosition(current.side),
        preferredSide: isClearlyBetter ? best.side : undefined,
    };
};
