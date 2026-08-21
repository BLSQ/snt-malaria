import { Budget, BudgetIntervention } from '../types/budget';
import {
    aggregateInterventionCosts,
    aggregateOrgUnitCosts,
    PROCUREMENT_CATEGORY,
} from './budget-aggregation';

/**
 * Aggregation helpers for the Comparison tab. Unlike `budget-aggregation.ts`,
 * which operates on a scenario's full multi-year `Budget[]`, these all take
 * a single, already year-scoped `Budget` — one per comparison slot.
 */

export const getSlotTotalCost = (
    budget: Budget | undefined,
): number | undefined => budget?.total_cost;

export const getSlotInterventionCosts = (
    budget: Budget | undefined,
): BudgetIntervention[] =>
    budget ? aggregateInterventionCosts(aggregateOrgUnitCosts([budget])) : [];

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

/**
 * Population-coverage figures per intervention, broken down by population
 * layer -- an intervention's proportional procurement cost lines can target
 * different, non-exclusive population layers (e.g. under-5s and pregnant
 * women), so layers are kept separate rather than collapsed into a single
 * figure (mirrors `aggregatePopulationLayersByIntervention`). Interventions
 * with no such line are omitted.
 */
export const getSlotInterventionCoverage = (
    budget: Budget | undefined,
): InterventionCoverage[] => {
    if (!budget) {
        return [];
    }
    return budget.interventions
        .map(intervention => {
            const layerById = new Map<number, PopulationLayerCoverage>();
            (intervention.cost_breakdown ?? []).forEach(line => {
                if (
                    !line.is_proportional ||
                    line.category !== PROCUREMENT_CATEGORY ||
                    line.target_population_layer_id == null ||
                    !line.target_population
                ) {
                    return;
                }
                if (!layerById.has(line.target_population_layer_id)) {
                    layerById.set(line.target_population_layer_id, {
                        layerId: line.target_population_layer_id,
                        layerName: line.target_population,
                        personsAtRisk: line.population,
                        percentEligible: line.yearly_value,
                    });
                }
            });
            return {
                interventionId: intervention.id,
                interventionLabel: intervention.type,
                layers: Array.from(layerById.values()),
            };
        })
        .filter(intervention => intervention.layers.length > 0);
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
 * Unions each slot's per-intervention population-layer coverage into one row
 * per (intervention, layer) pair, each carrying every slot's figures keyed
 * by slot key -- the shape a single combined table needs. Mirrors
 * `mergeCommodityRowsBySlot`.
 */
export const mergeCoverageRowsBySlot = (
    coverageBySlotKey: Map<string, InterventionCoverage[]>,
): CoverageTableRow[] => {
    const rowByKey = new Map<string, CoverageTableRow>();

    coverageBySlotKey.forEach((interventions, slotKey) => {
        interventions.forEach(intervention => {
            intervention.layers.forEach(layer => {
                const key = `${intervention.interventionId}::${layer.layerId}`;
                const row = rowByKey.get(key) ?? {
                    interventionId: intervention.interventionId,
                    interventionLabel: intervention.interventionLabel,
                    layerId: layer.layerId,
                    layerName: layer.layerName,
                    cellBySlotKey: {},
                };
                row.cellBySlotKey[slotKey] = {
                    personsAtRisk: layer.personsAtRisk,
                    percentEligible: layer.percentEligible,
                };
                rowByKey.set(key, row);
            });
        });
    });

    return Array.from(rowByKey.values()).sort(
        (a, b) =>
            a.interventionId - b.interventionId ||
            a.layerName.localeCompare(b.layerName),
    );
};

export type InterventionDistrictCoverage = {
    interventionId: number;
    interventionLabel: string;
    districtCount: number;
};

/**
 * Year-accurate count of districts covered per intervention, derived from
 * `org_units_costs` (already filtered server-side to non-zero cost for this
 * budget's year) rather than the scenario-wide `InterventionPlan.org_units`.
 */
export const getSlotInterventionDistrictCoverage = (
    budget: Budget | undefined,
): InterventionDistrictCoverage[] => {
    if (!budget) {
        return [];
    }
    const orgUnitIdsByInterventionId = new Map<number, Set<number>>();
    const labelByInterventionId = new Map<number, string>();

    (budget.org_units_costs ?? []).forEach(orgUnitCost => {
        (orgUnitCost.interventions ?? []).forEach(intervention => {
            labelByInterventionId.set(intervention.id, intervention.type);
            const orgUnitIds =
                orgUnitIdsByInterventionId.get(intervention.id) ??
                new Set<number>();
            orgUnitIds.add(orgUnitCost.org_unit_id);
            orgUnitIdsByInterventionId.set(intervention.id, orgUnitIds);
        });
    });

    return Array.from(orgUnitIdsByInterventionId.entries()).map(
        ([interventionId, orgUnitIds]) => ({
            interventionId,
            interventionLabel: labelByInterventionId.get(interventionId) ?? '',
            districtCount: orgUnitIds.size,
        }),
    );
};

export type InterventionIdentity = {
    interventionId: number;
    interventionLabel: string;
};

/**
 * Union of intervention identities across every slot, ordered alphabetically
 * by label. Gives side-by-side per-slot charts/tables (each rendered as its
 * own independent chart, unlike the overlay's single merged one) a shared
 * row order, so the same intervention lands on the same row in every slot
 * even when slots don't share the exact same intervention set -- sorting
 * each slot's own list independently can't guarantee that when the sets
 * differ.
 */
export const getSharedInterventionOrder = (
    rowsBySlotIndex: InterventionIdentity[][],
): InterventionIdentity[] => {
    const byId = new Map<number, InterventionIdentity>();
    rowsBySlotIndex.forEach(rows => {
        rows.forEach(row => {
            if (!byId.has(row.interventionId)) {
                byId.set(row.interventionId, row);
            }
        });
    });
    return Array.from(byId.values()).sort((a, b) =>
        a.interventionLabel.localeCompare(b.interventionLabel),
    );
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

/**
 * Unions per-slot intervention rows into one row per intervention, each
 * carrying every slot's value keyed by slot key. Every slot key is
 * zero-filled onto every row, even where that slot has no data for the
 * intervention, so bar/radar series stay aligned across categories.
 */
export const mergeSlotRowsByIntervention = (
    rowsBySlotKey: Map<string, InterventionSlotRow[]>,
): MergedInterventionRow[] => {
    const slotKeys = Array.from(rowsBySlotKey.keys());
    const labelByInterventionId = new Map<number, string>();
    const valueBySlotKeyByIntervention = new Map<
        number,
        Record<string, number>
    >();

    rowsBySlotKey.forEach((rows, slotKey) => {
        rows.forEach(row => {
            labelByInterventionId.set(
                row.interventionId,
                row.interventionLabel,
            );
            const valueBySlotKey =
                valueBySlotKeyByIntervention.get(row.interventionId) ?? {};
            valueBySlotKey[slotKey] = row.value;
            valueBySlotKeyByIntervention.set(
                row.interventionId,
                valueBySlotKey,
            );
        });
    });

    return Array.from(labelByInterventionId.entries()).map(
        ([interventionId, interventionLabel]) => {
            const valueBySlotKey =
                valueBySlotKeyByIntervention.get(interventionId) ?? {};
            slotKeys.forEach(slotKey => {
                if (!(slotKey in valueBySlotKey)) {
                    valueBySlotKey[slotKey] = 0;
                }
            });
            return { interventionId, interventionLabel, valueBySlotKey };
        },
    );
};

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

/**
 * Unions each slot's per-intervention commodity lines into one row per
 * (intervention, commodity) pair, each carrying every slot's figures keyed
 * by slot key — the shape a single combined table needs.
 */
export const mergeCommodityRowsBySlot = (
    commoditiesBySlotKey: Map<string, InterventionCommodities[]>,
): CommodityTableRow[] => {
    const rowByKey = new Map<string, CommodityTableRow>();

    commoditiesBySlotKey.forEach((interventions, slotKey) => {
        interventions.forEach(intervention => {
            intervention.commodities.forEach(commodity => {
                const key = `${intervention.interventionId}::${commodity.unitName}`;
                const row = rowByKey.get(key) ?? {
                    interventionId: intervention.interventionId,
                    interventionLabel: intervention.interventionLabel,
                    unitName: commodity.unitName,
                    cellBySlotKey: {},
                };
                row.cellBySlotKey[slotKey] = {
                    quantity: commodity.quantity,
                    unitCost: commodity.unitCost,
                    totalCost: commodity.totalCost,
                };
                rowByKey.set(key, row);
            });
        });
    });

    return Array.from(rowByKey.values()).sort(
        (a, b) =>
            a.interventionId - b.interventionId ||
            a.unitName.localeCompare(b.unitName),
    );
};

/**
 * Commodity lines grouped by intervention (unlike
 * `aggregateProcurementQuantitiesByUnit`, which flattens across every
 * intervention into one global total per unit).
 */
export const getSlotCommoditiesByIntervention = (
    budget: Budget | undefined,
    commodityUnitNames: Set<string>,
): InterventionCommodities[] => {
    if (!budget) {
        return [];
    }
    return budget.interventions
        .map(intervention => {
            const linesByUnit = new Map<string, InterventionCommodityLine>();
            (intervention.cost_breakdown ?? []).forEach(line => {
                if (
                    line.category !== PROCUREMENT_CATEGORY ||
                    !line.cost_unit_name ||
                    !commodityUnitNames.has(line.cost_unit_name)
                ) {
                    return;
                }
                const existing = linesByUnit.get(line.cost_unit_name);
                if (existing) {
                    existing.quantity += line.quantity;
                    existing.totalCost += line.total_cost;
                } else {
                    linesByUnit.set(line.cost_unit_name, {
                        unitName: line.cost_unit_name,
                        quantity: line.quantity,
                        unitCost: line.unit_cost,
                        totalCost: line.total_cost,
                    });
                }
            });
            return {
                interventionId: intervention.id,
                interventionLabel: intervention.type,
                commodities: Array.from(linesByUnit.values()),
            };
        })
        .filter(entry => entry.commodities.length > 0);
};
