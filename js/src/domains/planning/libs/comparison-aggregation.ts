import {
    orderByCategoryCost,
    UNCATEGORIZED_KEY,
} from '../hooks/useInterventionCategoryColors';
import { Budget, BudgetIntervention } from '../types/budget';
import {
    CommodityCell,
    CommodityTableRow,
    CoverageCell,
    CoverageTableRow,
    InterventionCommodities,
    InterventionCommodityLine,
    InterventionCostIdentity,
    InterventionCoverage,
    InterventionDistrictCoverage,
    InterventionIdentity,
    InterventionSlotRow,
    MergedInterventionRow,
    MergedSubRow,
    PopulationLayerCoverage,
    SubRow,
} from '../types/comparisonAggregation';
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
    orgUnitIds?: Set<number>,
): BudgetIntervention[] =>
    budget
        ? aggregateInterventionCosts(
              aggregateOrgUnitCosts([budget], orgUnitIds),
          )
        : [];

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

/**
 * Shared core of `mergeCoverageRowsBySlot` and `mergeCommodityRowsBySlot`:
 * unions each slot's (intervention, sub-item) rows -- population layer or
 * commodity line -- into one row per (interventionId, subKey) pair, each
 * carrying every slot's cell keyed by slot key, sorted by intervention then
 * the sub-item's label.
 */
const mergeSubRowsBySlot = <TCell>(
    rowsBySlotKey: Map<string, SubRow<TCell>[]>,
): MergedSubRow<TCell>[] => {
    const rowByKey = new Map<string, MergedSubRow<TCell>>();

    rowsBySlotKey.forEach((rows, slotKey) => {
        rows.forEach(row => {
            const key = `${row.interventionId}::${row.subKey}`;
            const merged = rowByKey.get(key) ?? {
                interventionId: row.interventionId,
                interventionLabel: row.interventionLabel,
                subKey: row.subKey,
                subLabel: row.subLabel,
                cellBySlotKey: {},
            };
            merged.cellBySlotKey[slotKey] = row.cell;
            rowByKey.set(key, merged);
        });
    });

    return Array.from(rowByKey.values()).sort(
        (a, b) =>
            a.interventionId - b.interventionId ||
            a.subLabel.localeCompare(b.subLabel),
    );
};

/**
 * Unions each slot's per-intervention population-layer coverage into one row
 * per (intervention, layer) pair, each carrying every slot's figures keyed
 * by slot key -- the shape a single combined table needs.
 */
export const mergeCoverageRowsBySlot = (
    coverageBySlotKey: Map<string, InterventionCoverage[]>,
): CoverageTableRow[] => {
    const subRowsBySlotKey = new Map<string, SubRow<CoverageCell>[]>();
    coverageBySlotKey.forEach((interventions, slotKey) => {
        subRowsBySlotKey.set(
            slotKey,
            interventions.flatMap(intervention =>
                intervention.layers.map(layer => ({
                    interventionId: intervention.interventionId,
                    interventionLabel: intervention.interventionLabel,
                    subKey: layer.layerId,
                    subLabel: layer.layerName,
                    cell: {
                        personsAtRisk: layer.personsAtRisk,
                        percentEligible: layer.percentEligible,
                    },
                })),
            ),
        );
    });

    return mergeSubRowsBySlot(subRowsBySlotKey).map(row => ({
        interventionId: row.interventionId,
        interventionLabel: row.interventionLabel,
        layerId: row.subKey as number,
        layerName: row.subLabel,
        cellBySlotKey: row.cellBySlotKey,
    }));
};

/**
 * Year-accurate count of districts covered per intervention, derived from
 * `org_units_costs` (already filtered server-side to non-zero cost for this
 * budget's year) rather than the scenario-wide `InterventionPlan.org_units`.
 * When `orgUnitIds` is provided, only those org units are counted (mirrors
 * `aggregateOrgUnitCosts`'s filtering).
 */
export const getSlotInterventionDistrictCoverage = (
    budget: Budget | undefined,
    orgUnitIds?: Set<number>,
): InterventionDistrictCoverage[] => {
    if (!budget) {
        return [];
    }
    const districtIdsByInterventionId = new Map<number, Set<number>>();
    const labelByInterventionId = new Map<number, string>();

    (budget.org_units_costs ?? []).forEach(orgUnitCost => {
        if (orgUnitIds && !orgUnitIds.has(orgUnitCost.org_unit_id)) {
            return;
        }
        (orgUnitCost.interventions ?? []).forEach(intervention => {
            labelByInterventionId.set(intervention.id, intervention.type);
            const districtIds =
                districtIdsByInterventionId.get(intervention.id) ??
                new Set<number>();
            districtIds.add(orgUnitCost.org_unit_id);
            districtIdsByInterventionId.set(intervention.id, districtIds);
        });
    });

    return Array.from(districtIdsByInterventionId.entries()).map(
        ([interventionId, districtIds]) => ({
            interventionId,
            interventionLabel: labelByInterventionId.get(interventionId) ?? '',
            districtCount: districtIds.size,
        }),
    );
};

/**
 * Union of intervention identities across every slot, ordered by intervention
 * category (largest-cost category first, largest intervention within a
 * category first) so the merged chart's bar groups keep same-category
 * interventions adjacent instead of scattering them. Cost is summed across
 * every slot so the order doesn't depend on which slot it's read from.
 */
export const getSharedInterventionOrderByCategory = (
    rowsBySlotIndex: InterventionCostIdentity[][],
    categoryIdByInterventionId: Map<number, number>,
): InterventionIdentity[] => {
    const totalCostById = new Map<number, number>();
    const labelById = new Map<number, string>();
    rowsBySlotIndex.forEach(rows => {
        rows.forEach(row => {
            totalCostById.set(
                row.interventionId,
                (totalCostById.get(row.interventionId) ?? 0) + row.cost,
            );
            if (!labelById.has(row.interventionId)) {
                labelById.set(row.interventionId, row.interventionLabel);
            }
        });
    });

    const identities: InterventionIdentity[] = Array.from(
        totalCostById.keys(),
    ).map(interventionId => ({
        interventionId,
        interventionLabel: labelById.get(interventionId) ?? '',
    }));

    return orderByCategoryCost(
        identities,
        identity =>
            categoryIdByInterventionId.get(identity.interventionId) ??
            UNCATEGORIZED_KEY,
        identity => totalCostById.get(identity.interventionId) ?? 0,
    );
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

/**
 * Unions each slot's per-intervention commodity lines into one row per
 * (intervention, commodity) pair, each carrying every slot's figures keyed
 * by slot key — the shape a single combined table needs.
 */
export const mergeCommodityRowsBySlot = (
    commoditiesBySlotKey: Map<string, InterventionCommodities[]>,
): CommodityTableRow[] => {
    const subRowsBySlotKey = new Map<string, SubRow<CommodityCell>[]>();
    commoditiesBySlotKey.forEach((interventions, slotKey) => {
        subRowsBySlotKey.set(
            slotKey,
            interventions.flatMap(intervention =>
                intervention.commodities.map(commodity => ({
                    interventionId: intervention.interventionId,
                    interventionLabel: intervention.interventionLabel,
                    subKey: commodity.unitName,
                    subLabel: commodity.unitName,
                    cell: {
                        quantity: commodity.quantity,
                        unitCost: commodity.unitCost,
                        totalCost: commodity.totalCost,
                    },
                })),
            ),
        );
    });

    return mergeSubRowsBySlot(subRowsBySlotKey).map(row => ({
        interventionId: row.interventionId,
        interventionLabel: row.interventionLabel,
        unitName: row.subLabel,
        cellBySlotKey: row.cellBySlotKey,
    }));
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
