import { toggleLeaf } from './scopeTreeUtils';

const toggle = (
    leafId: number,
    { hand = [], exc = [], rule = [] }: Record<string, number[]>,
) => {
    const next = toggleLeaf(leafId, new Set(hand), new Set(exc), new Set(rule));
    return { hand: Array.from(next.hand), exc: Array.from(next.exc) };
};

describe('toggleLeaf', () => {
    it('handpicks a leaf the rule does not match', () => {
        expect(toggle(3, { rule: [1, 2] })).toEqual({ hand: [3], exc: [] });
    });

    it('excludes a leaf the rule matches', () => {
        expect(toggle(2, { rule: [1, 2] })).toEqual({ hand: [], exc: [2] });
    });

    it('restores an excluded leaf', () => {
        expect(toggle(2, { rule: [1, 2], hand: [5], exc: [2] })).toEqual({
            hand: [5],
            exc: [],
        });
    });

    it('removes a handpicked leaf', () => {
        expect(toggle(5, { rule: [1], hand: [5] })).toEqual({
            hand: [],
            exc: [],
        });
    });
});
