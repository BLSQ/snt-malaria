import {
    Budget,
    BudgetIntervention,
    BudgetInterventionCostLine,
    BudgetOrgUnit,
} from '../types/budget';

/** Group items by key, merging duplicates via `merge`. */
function mergeByKey<T>(
    items: T[],
    getKey: (item: T) => string,
    merge: (existing: T, incoming: T) => T,
): T[] {
    const map = new Map<string, T>();
    items.forEach(item => {
        const key = getKey(item);
        const existing = map.get(key);
        map.set(key, existing ? merge(existing, item) : { ...item });
    });
    return Array.from(map.values());
}

function mergeCostLines(
    lines: BudgetInterventionCostLine[],
): BudgetInterventionCostLine[] {
    return mergeByKey(
        lines,
        line => line.category,
        (a, b) => ({ ...a, total_cost: a.total_cost + b.total_cost }),
    );
}

function mergeInterventions(
    interventions: BudgetIntervention[],
): BudgetIntervention[] {
    return mergeByKey(
        interventions,
        intervention => String(intervention.id),
        (a, b) => ({
            ...a,
            total_cost: a.total_cost + b.total_cost,
            cost_breakdown: mergeCostLines([
                ...(a.cost_breakdown ?? []),
                ...(b.cost_breakdown ?? []),
            ]),
        }),
    );
}

function mergeOrgUnits(orgUnits: BudgetOrgUnit[]): BudgetOrgUnit[] {
    return mergeByKey(
        orgUnits,
        orgUnit => String(orgUnit.org_unit_id),
        (a, b) => ({
            ...a,
            total_cost: a.total_cost + b.total_cost,
            interventions: mergeInterventions([
                ...(a.interventions ?? []),
                ...(b.interventions ?? []),
            ]),
        }),
    );
}

/**
 * Flattens per-year org-unit costs into a single "entire period" list,
 * summing costs across years. When `orgUnitIds` is provided, only those org
 * units are kept (so the widgets stay in sync with the displayed org units).
 */
export const aggregateOrgUnitCosts = (
    budgets: Budget[],
    orgUnitIds?: Set<number>,
): BudgetOrgUnit[] => {
    const merged = mergeOrgUnits(budgets.flatMap(b => b.org_units_costs ?? []));
    return orgUnitIds
        ? merged.filter(ouc => orgUnitIds.has(ouc.org_unit_id))
        : merged;
};

/**
 * Aggregates intervention costs across the supplied org units, sorted by
 * total cost descending (largest contributor first).
 */
export const aggregateInterventionCosts = (
    orgUnitCosts: BudgetOrgUnit[],
): BudgetIntervention[] =>
    mergeInterventions(
        orgUnitCosts.flatMap(ouc => ouc.interventions ?? []),
    ).sort((a, b) => b.total_cost - a.total_cost);

// Backend cost category value (InterventionCostBreakdownLineCategory.PROCUREMENT).
const PROCUREMENT_CATEGORY = 'Procurement';

export type CommodityQuantity = {
    unitName: string;
    quantity: number;
};

/**
 * Sums the procurement quantities of every cost line across all years and
 * interventions, grouped by cost unit. Only lines whose unit is in
 * `commodityUnitNames` are counted; lines without a unit are ignored since
 * they can't be expressed as a commodity.
 */
export const aggregateProcurementQuantitiesByUnit = (
    budgets: Budget[],
    commodityUnitNames: Set<string>,
): CommodityQuantity[] => {
    const quantityByUnit = new Map<string, number>();
    budgets.forEach(budget => {
        (budget.interventions ?? []).forEach(intervention => {
            (intervention.cost_breakdown ?? []).forEach(line => {
                if (line.category !== PROCUREMENT_CATEGORY) {
                    return;
                }
                if (!line.cost_unit_name || !line.quantity) {
                    return;
                }
                if (!commodityUnitNames.has(line.cost_unit_name)) {
                    return;
                }
                quantityByUnit.set(
                    line.cost_unit_name,
                    (quantityByUnit.get(line.cost_unit_name) ?? 0) +
                        line.quantity,
                );
            });
        });
    });
    return Array.from(quantityByUnit, ([unitName, quantity]) => ({
        unitName,
        quantity,
    })).sort((a, b) => b.quantity - a.quantity);
};
