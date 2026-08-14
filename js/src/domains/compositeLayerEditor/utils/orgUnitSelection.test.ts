import {
    DEFAULT_ORG_UNIT_SELECTION,
    isDistrictPicked,
    isOrgUnitSelected,
    normalizeSelection,
    resetSelectionOverrides,
    resolveSelectedOrgUnitIds,
    setSelectionMode,
    toggleOrgUnit,
} from './orgUnitSelection';

describe('normalizeSelection', () => {
    it('defaults to "all" mode with no ids for a missing/empty value', () => {
        expect(normalizeSelection(undefined)).to.deep.equal({
            mode: 'all',
            ids: [],
        });
        expect(normalizeSelection(null)).to.deep.equal({
            mode: 'all',
            ids: [],
        });
        expect(normalizeSelection({})).to.deep.equal({ mode: 'all', ids: [] });
    });

    it('keeps an explicit "none" mode', () => {
        expect(normalizeSelection({ mode: 'none' })).to.deep.equal({
            mode: 'none',
            ids: [],
        });
    });

    it('falls back to "all" for any mode value other than "none"', () => {
        expect(normalizeSelection({ mode: 'bogus' })).to.deep.equal({
            mode: 'all',
            ids: [],
        });
    });

    it('coerces numeric-looking values, dedupes, and drops values that are not', () => {
        expect(
            normalizeSelection({ mode: 'none', ids: [1, '2', 2, 'x', undefined] }),
        ).to.deep.equal({ mode: 'none', ids: [1, 2] });
    });

    it('treats a non-array ids value as empty', () => {
        expect(
            normalizeSelection({ mode: 'none', ids: 'not-an-array' }),
        ).to.deep.equal({ mode: 'none', ids: [] });
    });
});

describe('isOrgUnitSelected', () => {
    it('under "all", selects everything except the ids list', () => {
        const selection = { mode: 'all' as const, ids: [2] };
        expect(isOrgUnitSelected(selection, 1)).to.equal(true);
        expect(isOrgUnitSelected(selection, 2)).to.equal(false);
    });

    it('under "none", selects only the ids list', () => {
        const selection = { mode: 'none' as const, ids: [2] };
        expect(isOrgUnitSelected(selection, 1)).to.equal(false);
        expect(isOrgUnitSelected(selection, 2)).to.equal(true);
    });
});

describe('resolveSelectedOrgUnitIds', () => {
    it('filters the full id list down to the selected ones', () => {
        expect(
            resolveSelectedOrgUnitIds({ mode: 'none', ids: [2, 3] }, [
                1, 2, 3, 4,
            ]),
        ).to.deep.equal([2, 3]);
        expect(
            resolveSelectedOrgUnitIds({ mode: 'all', ids: [2, 3] }, [
                1, 2, 3, 4,
            ]),
        ).to.deep.equal([1, 4]);
    });
});

describe('isDistrictPicked', () => {
    it('reflects raw ids membership regardless of mode', () => {
        expect(
            isDistrictPicked({ mode: 'all', ids: [5] }, 5),
        ).to.equal(true);
        expect(
            isDistrictPicked({ mode: 'none', ids: [5] }, 5),
        ).to.equal(true);
        expect(
            isDistrictPicked({ mode: 'all', ids: [5] }, 6),
        ).to.equal(false);
    });
});

describe('toggleOrgUnit', () => {
    it('adds an id not yet in the list', () => {
        expect(
            toggleOrgUnit({ mode: 'all', ids: [1] }, 2),
        ).to.deep.equal({ mode: 'all', ids: [1, 2] });
    });

    it('removes an id already in the list', () => {
        expect(
            toggleOrgUnit({ mode: 'all', ids: [1, 2] }, 1),
        ).to.deep.equal({ mode: 'all', ids: [2] });
    });
});

describe('setSelectionMode', () => {
    it('returns the same reference when the mode is unchanged', () => {
        const selection = { mode: 'all' as const, ids: [1] };
        expect(setSelectionMode(selection, 'all')).to.equal(selection);
    });

    it('flips mode while keeping the same ids, changing what ends up selected', () => {
        const selection = { mode: 'all' as const, ids: [1, 2] };
        const next = setSelectionMode(selection, 'none');
        expect(next).to.deep.equal({ mode: 'none', ids: [1, 2] });
        // Under "all" those ids were EXCLUDED; under "none" the same ids are now the only INCLUDED ones.
        expect(resolveSelectedOrgUnitIds(selection, [1, 2, 3])).to.deep.equal([
            3,
        ]);
        expect(resolveSelectedOrgUnitIds(next, [1, 2, 3])).to.deep.equal([
            1, 2,
        ]);
    });
});

describe('resetSelectionOverrides', () => {
    it('clears ids while keeping the given mode', () => {
        expect(resetSelectionOverrides('none')).to.deep.equal({
            mode: 'none',
            ids: [],
        });
    });
});

describe('DEFAULT_ORG_UNIT_SELECTION', () => {
    it('is a no-op selection (mode "all", nothing excluded)', () => {
        expect(DEFAULT_ORG_UNIT_SELECTION).to.deep.equal({
            mode: 'all',
            ids: [],
        });
    });
});
