import { resolveStackOrder } from './stackOrder';

describe('resolveStackOrder', () => {
    it('returns connected ports sorted when there is no priority order', () => {
        expect(resolveStackOrder(undefined, ['b', 'a'])).toEqual(['a', 'b']);
    });

    it('keeps a valid priority order for currently-connected ports', () => {
        expect(resolveStackOrder(['b', 'a'], ['a', 'b'])).toEqual(['b', 'a']);
    });

    it('drops entries for ports that are no longer connected', () => {
        expect(resolveStackOrder(['z', 'a', 'b'], ['a', 'b'])).toEqual([
            'a',
            'b',
        ]);
    });

    it('collapses duplicate entries to their first occurrence', () => {
        expect(resolveStackOrder(['a', 'a', 'b'], ['a', 'b'])).toEqual([
            'a',
            'b',
        ]);
    });

    it('prepends a connected port missing from the list at the lowest-priority end', () => {
        // "a" is connected but not mentioned - it must land before the explicitly-ordered ones.
        expect(resolveStackOrder(['b', 'c'], ['a', 'b', 'c'])).toEqual([
            'a',
            'b',
            'c',
        ]);
    });

    it('falls back to sorted ports for a malformed (non-array) priority order', () => {
        expect(resolveStackOrder('a', ['b', 'a'])).toEqual(['a', 'b']);
        expect(resolveStackOrder(null, ['b', 'a'])).toEqual(['a', 'b']);
    });

    it('ignores non-string entries in the priority order', () => {
        expect(resolveStackOrder([1, 'a', null], ['a', 'b'])).toEqual([
            'b',
            'a',
        ]);
    });

    it('returns an empty array for no connected ports', () => {
        expect(resolveStackOrder(['a', 'b'], [])).toEqual([]);
    });
});
