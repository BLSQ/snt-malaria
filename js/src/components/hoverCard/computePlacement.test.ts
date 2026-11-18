import {
    computePlacement,
    GetCoverage,
    POINTER_OFFSET,
    Rect,
} from './computePlacement';

const getRectsCoverage =
    (avoidRects: Rect[]): GetCoverage =>
    rect =>
        avoidRects.reduce((area, avoid) => {
            const width =
                Math.min(rect.right, avoid.right) -
                Math.max(rect.left, avoid.left);
            const height =
                Math.min(rect.bottom, avoid.bottom) -
                Math.max(rect.top, avoid.top);
            return width > 0 && height > 0 ? area + width * height : area;
        }, 0);

const viewport = { width: 1000, height: 800 };
const size = { width: 200, height: 100 };

describe('computePlacement', () => {
    it('opens below and to the right of the pointer by default', () => {
        const placement = computePlacement({
            anchor: { x: 400, y: 300 },
            size,
            viewport,
            getCoverage: getRectsCoverage([]),
        });

        expect(placement.side).toEqual({ up: false, left: false });
        expect(placement.position).toEqual({
            x: 400 + POINTER_OFFSET,
            y: 300 + POINTER_OFFSET,
        });
        expect(placement.preferredSide).toBeUndefined();
    });

    it('opens upwards and to the left near the bottom-right corner', () => {
        const placement = computePlacement({
            anchor: { x: 950, y: 780 },
            size,
            viewport,
            getCoverage: getRectsCoverage([]),
        });

        expect(placement.side).toEqual({ up: true, left: true });
        expect(placement.position).toEqual({
            x: 950 - POINTER_OFFSET - size.width,
            y: 780 - POINTER_OFFSET - size.height,
        });
    });

    it('picks the side covering the least of the avoided areas', () => {
        const placement = computePlacement({
            anchor: { x: 400, y: 300 },
            size,
            viewport,
            getCoverage: getRectsCoverage([
                { left: 400, top: 0, right: 1000, bottom: 800 },
            ]),
        });

        expect(placement.side.left).toBe(true);
    });

    it('keeps the default side when sides cover the same area', () => {
        const placement = computePlacement({
            anchor: { x: 400, y: 300 },
            size,
            viewport,
            getCoverage: getRectsCoverage([
                { left: 0, top: 0, right: 1000, bottom: 800 },
            ]),
        });

        expect(placement.side).toEqual({ up: false, left: false });
    });

    it('keeps the current side and reports a clearly better one as preferred', () => {
        const placement = computePlacement({
            anchor: { x: 400, y: 300 },
            size,
            viewport,
            getCoverage: getRectsCoverage([
                { left: 400, top: 0, right: 1000, bottom: 800 },
            ]),
            currentSide: { up: false, left: false },
        });

        expect(placement.side).toEqual({ up: false, left: false });
        expect(placement.preferredSide).toEqual({ up: false, left: true });
    });

    it('does not prefer another side when the gain is small', () => {
        const placement = computePlacement({
            anchor: { x: 400, y: 300 },
            size,
            viewport,
            getCoverage: getRectsCoverage([
                { left: 590, top: 0, right: 1000, bottom: 800 },
            ]),
            currentSide: { up: false, left: false },
        });

        expect(placement.side).toEqual({ up: false, left: false });
        expect(placement.preferredSide).toBeUndefined();
    });

    it('does not prefer another side that still hides more than half as much', () => {
        const placement = computePlacement({
            anchor: { x: 400, y: 300 },
            size,
            viewport,
            getCoverage: getRectsCoverage([
                { left: 264, top: 0, right: 1000, bottom: 800 },
            ]),
            currentSide: { up: false, left: false },
        });

        expect(placement.side).toEqual({ up: false, left: false });
        expect(placement.preferredSide).toBeUndefined();
    });

    it('switches away from the current side once it no longer fits', () => {
        const placement = computePlacement({
            anchor: { x: 950, y: 300 },
            size,
            viewport,
            getCoverage: getRectsCoverage([]),
            currentSide: { up: false, left: false },
        });

        expect(placement.side).toEqual({ up: false, left: true });
    });

    it('clamps the card into the viewport when no side fits', () => {
        const placement = computePlacement({
            anchor: { x: 50, y: 50 },
            size: { width: 1200, height: 100 },
            viewport,
            getCoverage: getRectsCoverage([]),
        });

        expect(placement.position.x).toBe(0);
    });

    it('chooses the side for the planned size but positions the current size', () => {
        const anchor = { x: 400, y: 600 };
        const placement = computePlacement({
            anchor,
            size,
            plannedSize: { width: 340, height: 300 },
            viewport,
            getCoverage: getRectsCoverage([]),
        });

        expect(placement.side).toEqual({ up: true, left: false });
        expect(placement.position).toEqual({
            x: anchor.x + POINTER_OFFSET,
            y: anchor.y - POINTER_OFFSET - size.height,
        });
    });
});
