export type PopulationLayerCoverage = {
    layerId: number;
    layerName: string;
    personsAtRisk: number;
    // Yearly coverage ratio, e.g. 0.78 for a 78% bed-net target.
    percentEligible: number;
};

export type InterventionCoverage = {
    interventionId: number;
    interventionLabel: string;
    layers: PopulationLayerCoverage[];
};

export type CoverageCell = {
    personsAtRisk: number;
    percentEligible: number;
};

export type CoverageTableRow = {
    interventionId: number;
    interventionLabel: string;
    layerId: number;
    layerName: string;
    cellBySlotKey: Record<string, CoverageCell>;
};

/**
 * A single (intervention, sub-item) row for one slot, flattened out of
 * whatever nested per-intervention shape the caller holds -- the common
 * input shape `mergeSubRowsBySlot` groups into a combined table row.
 */
export type SubRow<TCell> = {
    interventionId: number;
    interventionLabel: string;
    subKey: string | number;
    subLabel: string;
    cell: TCell;
};

export type MergedSubRow<TCell> = {
    interventionId: number;
    interventionLabel: string;
    subKey: string | number;
    subLabel: string;
    cellBySlotKey: Record<string, TCell>;
};

export type InterventionDistrictCoverage = {
    interventionId: number;
    interventionLabel: string;
    districtCount: number;
};

export type InterventionIdentity = {
    interventionId: number;
    interventionLabel: string;
};

export type InterventionCostIdentity = InterventionIdentity & {
    cost: number;
};

export type InterventionSlotRow = {
    interventionId: number;
    interventionLabel: string;
    value: number;
};

export type MergedInterventionRow = {
    interventionId: number;
    interventionLabel: string;
    valueBySlotKey: Record<string, number>;
};

export type YearlyCost = {
    year: number;
    totalCost: number;
};

export type InterventionCostDeltaRow = {
    interventionId: number;
    interventionLabel: string;
    // `cost(intervention, comparedSlot) - cost(intervention, baseSlot)`, one
    // entry per compared slot key.
    deltaBySlotKey: Record<string, number>;
};

// One recharts row for the total-cost-per-year chart: `year` plus one entry
// per slot key. A slot missing a year has no key (the line shows a gap).
export type SlotYearlyCostRow = Record<string, number>;

export type InterventionCommodityLine = {
    unitName: string;
    quantity: number;
    unitCost: number | null;
    totalCost: number;
};

export type InterventionCommodities = {
    interventionId: number;
    interventionLabel: string;
    commodities: InterventionCommodityLine[];
};

export type CommodityCell = {
    quantity: number;
    unitCost: number | null;
    totalCost: number;
};

export type CommodityTableRow = {
    interventionId: number;
    interventionLabel: string;
    unitName: string;
    cellBySlotKey: Record<string, CommodityCell>;
};
