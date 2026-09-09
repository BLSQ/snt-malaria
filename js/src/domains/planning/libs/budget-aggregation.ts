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

type CostLineKeyFn = (line: BudgetInterventionCostLine) => string;

const byCategory: CostLineKeyFn = line => line.category;

// Keeps procurement lines distinct by commodity unit and population layer, so
// the per-commodity / per-layer widgets still see real sub-rows after an
// across-years merge that `byCategory` would otherwise collapse into one line.
const byCategoryUnitAndLayer: CostLineKeyFn = line =>
    `${line.category}::${line.cost_unit_name ?? ''}::${line.target_population_layer_id ?? ''}`;

function mergeCostLines(
    lines: BudgetInterventionCostLine[],
    getKey: CostLineKeyFn = byCategory,
): BudgetInterventionCostLine[] {
    return mergeByKey(lines, getKey, (a, b) => ({
        ...a,
        total_cost: a.total_cost + b.total_cost,
        quantity: a.quantity + b.quantity,
    }));
}

function mergeInterventions(
    interventions: BudgetIntervention[],
    getLineKey: CostLineKeyFn = byCategory,
): BudgetIntervention[] {
    return mergeByKey(
        interventions,
        intervention => String(intervention.id),
        (a, b) => ({
            ...a,
            total_cost: a.total_cost + b.total_cost,
            cost_breakdown: mergeCostLines(
                [...(a.cost_breakdown ?? []), ...(b.cost_breakdown ?? [])],
                getLineKey,
            ),
        }),
    );
}

function mergeOrgUnits(
    orgUnits: BudgetOrgUnit[],
    getLineKey: CostLineKeyFn = byCategory,
): BudgetOrgUnit[] {
    return mergeByKey(
        orgUnits,
        orgUnit => String(orgUnit.org_unit_id),
        (a, b) => ({
            ...a,
            total_cost: a.total_cost + b.total_cost,
            interventions: mergeInterventions(
                [...(a.interventions ?? []), ...(b.interventions ?? [])],
                getLineKey,
            ),
        }),
    );
}

/**
 * Collapses a scenario's per-year `Budget[]` into one synthetic budget
 * covering every year: costs and quantities are summed, and an org unit /
 * commodity / population layer is kept if it appears in any year. Powers the
 * Comparison tab's "All years" slot selection. `year` is 0 -- no real budget
 * spans year 0, so it doubles as the "all years" sentinel.
 */
export const mergeBudgets = (budgets: Budget[]): Budget => ({
    year: 0,
    total_cost: budgets.reduce((sum, budget) => sum + budget.total_cost, 0),
    interventions: mergeInterventions(
        budgets.flatMap(budget => budget.interventions ?? []),
        byCategoryUnitAndLayer,
    ),
    org_units_costs: mergeOrgUnits(
        budgets.flatMap(budget => budget.org_units_costs ?? []),
        byCategoryUnitAndLayer,
    ),
});

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

export type PopulationLayer = {
    id: number;
    name: string;
    population: number;
    // Sum of every cost line targeting this layer (across org units, years,
    // and cost categories) -- unlike population, cost is real spend and is
    // additive, so it isn't deduplicated per org unit the way population is.
    cost: number;
};

/**
 * Population and cost per intervention, broken down by population layer (a
 * cost line's `target_population_layer_id`). An intervention's cost lines
 * can target different, non-exclusive population layers (e.g. under-5s and
 * pregnant women), so layers are kept separate rather than merged into one
 * figure -- each layer gets its own population and the cost of the specific
 * line(s) that targeted it.
 *
 * Reads `Budget.interventions` (the top-level list) rather than
 * `org_units_costs`: it's already aggregated server-side across every org
 * unit in the budget, so no org-unit bookkeeping is needed here. Cost lines
 * sharing a layer are summed for `cost`, but `population` is taken once
 * (not summed) since those lines duplicate the same server-computed figure
 * rather than each holding a slice of it.
 *
 * Grouped by id rather than `target_population` (the layer's display name):
 * names aren't guaranteed unique, so grouping by name could silently merge
 * two distinct layers.
 */
export const aggregatePopulationLayersByIntervention = (
    interventions: BudgetIntervention[],
): Map<number, PopulationLayer[]> => {
    const result = new Map<number, PopulationLayer[]>();

    interventions.forEach(intervention => {
        // layer id -> { name, population, cost }.
        const layerById = new Map<number, PopulationLayer>();

        (intervention.cost_breakdown ?? []).forEach(line => {
            if (
                line.target_population_layer_id == null ||
                !line.target_population ||
                !line.population
            ) {
                return;
            }
            const layerId = line.target_population_layer_id;
            const layer = layerById.get(layerId) ?? {
                id: layerId,
                name: line.target_population,
                population: line.population,
                cost: 0,
            };
            layer.cost += line.total_cost;
            layerById.set(layerId, layer);
        });

        result.set(intervention.id, Array.from(layerById.values()));
    });

    return result;
};

// Backend cost category value (InterventionCostBreakdownLineCategory.PROCUREMENT).
export const PROCUREMENT_CATEGORY = 'Procurement';

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
