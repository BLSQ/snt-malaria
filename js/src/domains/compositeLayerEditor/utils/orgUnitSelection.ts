/**
 * Selection model for the `filter` node: an all/none base plus a single override list, mirroring
 * the scenario-rule builder's `(matched - excluded) | included` formula and the backend evaluator's
 * `_resolve_selected_org_units` (`services/composite/evaluator.py`) - collapsed to one list because
 * only one is ever meaningful for a given mode (the base already covers "the rest").
 */

export type OrgUnitSelectionMode = 'all' | 'none';

export type OrgUnitSelection = {
    mode: OrgUnitSelectionMode;
    /** Under `all`, the districts excluded from the base; under `none`, the districts included. */
    ids: number[];
};

export const DEFAULT_ORG_UNIT_SELECTION: OrgUnitSelection = {
    mode: 'all',
    ids: [],
};

const toIdArray = (raw: unknown): number[] => {
    if (!Array.isArray(raw)) return [];
    const ids = raw
        .map(entry => Number(entry))
        .filter(id => Number.isFinite(id));
    return Array.from(new Set(ids));
};

/** Defensive parse of a persisted or AI-supplied value into a well-formed selection. */
export const normalizeSelection = (raw: unknown): OrgUnitSelection => {
    const value = (raw ?? {}) as Partial<OrgUnitSelection>;
    const mode: OrgUnitSelectionMode = value.mode === 'none' ? 'none' : 'all';
    return { mode, ids: toIdArray(value.ids) };
};

/** Whether `orgUnitId` survives to the final filtered output - drives the map's highlighting. */
export const isOrgUnitSelected = (
    selection: OrgUnitSelection,
    orgUnitId: number,
): boolean =>
    selection.mode === 'all'
        ? !selection.ids.includes(orgUnitId)
        : selection.ids.includes(orgUnitId);

export const resolveSelectedOrgUnitIds = (
    selection: OrgUnitSelection,
    allOrgUnitIds: number[],
): number[] => allOrgUnitIds.filter(id => isOrgUnitSelected(selection, id));

/** Whether `orgUnitId` is checked in the bulk-edit checkbox list, regardless of mode. */
export const isDistrictPicked = (
    selection: OrgUnitSelection,
    orgUnitId: number,
): boolean => selection.ids.includes(orgUnitId);

/** Toggles `orgUnitId`'s membership in the selection's override list. */
export const toggleOrgUnit = (
    selection: OrgUnitSelection,
    orgUnitId: number,
): OrgUnitSelection => {
    const next = selection.ids.includes(orgUnitId)
        ? selection.ids.filter(id => id !== orgUnitId)
        : [...selection.ids, orgUnitId];
    return { ...selection, ids: next };
};

/**
 * Switches the base set, keeping the same override list: since `isOrgUnitSelected` branches on
 * `mode`, reinterpreting the same `ids` under the other mode automatically flips which districts
 * end up selected - no need to recompute or move anything between lists.
 */
export const setSelectionMode = (
    selection: OrgUnitSelection,
    mode: OrgUnitSelectionMode,
): OrgUnitSelection =>
    mode === selection.mode ? selection : { ...selection, mode };

/** Discards the override list, keeping the base mode - a fresh start. */
export const resetSelectionOverrides = (
    mode: OrgUnitSelectionMode,
): OrgUnitSelection => ({ mode, ids: [] });
