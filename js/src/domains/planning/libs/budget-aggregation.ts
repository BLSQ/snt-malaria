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
        intervention => `${intervention.type} - ${intervention.code}`,
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
