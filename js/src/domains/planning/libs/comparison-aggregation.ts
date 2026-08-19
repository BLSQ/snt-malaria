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

export type InterventionCoverage = {
    interventionId: number;
    interventionLabel: string;
    personsAtRisk: number;
    // Yearly coverage ratio, e.g. 0.78 for a 78% bed-net target.
    percentEligible: number;
};

/**
 * Population-coverage figures per intervention, read from the intervention's
 * proportional procurement cost line — the line that scales with population,
 * as opposed to distribution/other categories. Interventions with no such
 * line are omitted.
 */
export const getSlotInterventionCoverage = (
    budget: Budget | undefined,
): InterventionCoverage[] => {
    if (!budget) {
        return [];
    }
    return budget.interventions
        .map(intervention => {
            const line = intervention.cost_breakdown?.find(
                costLine =>
                    costLine.is_proportional &&
                    costLine.category === PROCUREMENT_CATEGORY,
            );
            if (!line) {
                return undefined;
            }
            return {
                interventionId: intervention.id,
                interventionLabel: intervention.type,
                personsAtRisk: line.population,
                percentEligible: line.yearly_value,
            };
        })
        .filter((row): row is InterventionCoverage => row !== undefined);
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
            labelByInterventionId.set(row.interventionId, row.interventionLabel);
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
