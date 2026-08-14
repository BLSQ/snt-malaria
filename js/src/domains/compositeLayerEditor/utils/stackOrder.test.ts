import { resolveStackOrder } from './stackOrder';

describe('resolveStackOrder', () => {
    it('returns connected ports sorted when there is no priority order', () => {
        expect(resolveStackOrder(undefined, ['b', 'a'])).to.deep.equal([
            'a',
            'b',
        ]);
    });

    it('keeps a valid priority order for currently-connected ports', () => {
        expect(resolveStackOrder(['b', 'a'], ['a', 'b'])).to.deep.equal([
            'b',
            'a',
        ]);
    });

    it('drops entries for ports that are no longer connected', () => {
        expect(resolveStackOrder(['z', 'a', 'b'], ['a', 'b'])).to.deep.equal([
            'a',
            'b',
        ]);
    });

    it('collapses duplicate entries to their first occurrence', () => {
        expect(
            resolveStackOrder(['a', 'a', 'b'], ['a', 'b']),
        ).to.deep.equal(['a', 'b']);
    });

    it('prepends a connected port missing from the list at the lowest-priority end', () => {
        // "a" is connected but not mentioned - it must land before the explicitly-ordered ones.
        expect(resolveStackOrder(['b', 'c'], ['a', 'b', 'c'])).to.deep.equal([
            'a',
            'b',
            'c',
        ]);
    });

    it('falls back to sorted ports for a malformed (non-array) priority order', () => {
        expect(resolveStackOrder('a', ['b', 'a'])).to.deep.equal(['a', 'b']);
        expect(resolveStackOrder(null, ['b', 'a'])).to.deep.equal(['a', 'b']);
    });

    it('ignores non-string entries in the priority order', () => {
        expect(resolveStackOrder([1, 'a', null], ['a', 'b'])).to.deep.equal([
            'b',
            'a',
        ]);
    });

    it('returns an empty array for no connected ports', () => {
        expect(resolveStackOrder(['a', 'b'], [])).to.deep.equal([]);
    });
});
