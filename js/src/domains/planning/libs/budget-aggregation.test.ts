import {
    Budget,
    BudgetIntervention,
    BudgetInterventionCostLine,
    BudgetOrgUnit,
} from '../types/budget';
import {
    mergeBudgets,
    PROCUREMENT_CATEGORY,
    aggregateInterventionCosts,
    aggregateOrgUnitCosts,
} from './budget-aggregation';

const makeCostLine = (
    overrides: Partial<BudgetInterventionCostLine> = {},
): BudgetInterventionCostLine => ({
    total_cost: 0,
    quantity: 0,
    category: PROCUREMENT_CATEGORY,
    name: 'line',
    id: 1,
    unit_cost: null,
    cost_unit_name: null,
    conversion_factor: null,
    invert_conversion_factor: false,
    target_population: null,
    target_population_layer_id: null,
    population: 0,
    is_proportional: false,
    yearly_value: 0,
    buffer: null,
    ...overrides,
});

const makeIntervention = (
    overrides: Partial<BudgetIntervention> = {},
): BudgetIntervention => ({
    id: 1,
    type: 'Bed nets',
    code: 'BN',
    total_cost: 0,
    cost_breakdown: [],
    ...overrides,
});

const makeOrgUnitCost = (
    overrides: Partial<BudgetOrgUnit> = {},
): BudgetOrgUnit => ({
    org_unit_id: 1,
    total_cost: 0,
    interventions: [],
    ...overrides,
});

const makeBudget = (overrides: Partial<Budget> = {}): Budget => ({
    year: 2026,
    total_cost: 0,
    interventions: [],
    org_units_costs: [],
    ...overrides,
});

describe('mergeBudgets', () => {
    it('returns an empty year-0 budget when given no budgets', () => {
        expect(mergeBudgets([])).toEqual({
            year: 0,
            total_cost: 0,
            interventions: [],
            org_units_costs: [],
        });
    });

    it('sums total cost across every year and tags the result as year 0', () => {
        const merged = mergeBudgets([
            makeBudget({ year: 2026, total_cost: 100 }),
            makeBudget({ year: 2027, total_cost: 250 }),
        ]);
        expect(merged.year).toBe(0);
        expect(merged.total_cost).toBe(350);
    });

    it('unions org units across years, keeping a district seen in only one year and summing overlaps', () => {
        const merged = mergeBudgets([
            makeBudget({
                year: 2026,
                org_units_costs: [
                    makeOrgUnitCost({ org_unit_id: 1, total_cost: 10 }),
                    makeOrgUnitCost({ org_unit_id: 2, total_cost: 5 }),
                ],
            }),
            makeBudget({
                year: 2027,
                org_units_costs: [
                    makeOrgUnitCost({ org_unit_id: 1, total_cost: 15 }),
                ],
            }),
        ]);
        const byId = new Map(
            merged.org_units_costs.map(ouc => [
                ouc.org_unit_id,
                ouc.total_cost,
            ]),
        );
        expect(byId.get(1)).toBe(25);
        expect(byId.get(2)).toBe(5);
    });

    it('merges interventions by id across years, summing their total cost', () => {
        const merged = mergeBudgets([
            makeBudget({
                year: 2026,
                interventions: [
                    makeIntervention({ id: 1, total_cost: 40 }),
                    makeIntervention({ id: 2, total_cost: 7 }),
                ],
            }),
            makeBudget({
                year: 2027,
                interventions: [makeIntervention({ id: 1, total_cost: 60 })],
            }),
        ]);
        const byId = new Map(
            merged.interventions.map(i => [i.id, i.total_cost]),
        );
        expect(byId.get(1)).toBe(100);
        expect(byId.get(2)).toBe(7);
    });

    it('sums quantity and cost for the same commodity unit across years while keeping distinct units apart', () => {
        const merged = mergeBudgets([
            makeBudget({
                year: 2026,
                interventions: [
                    makeIntervention({
                        id: 1,
                        cost_breakdown: [
                            makeCostLine({
                                cost_unit_name: 'Net',
                                quantity: 100,
                                total_cost: 200,
                            }),
                            makeCostLine({
                                cost_unit_name: 'Kit',
                                quantity: 3,
                                total_cost: 30,
                            }),
                        ],
                    }),
                ],
            }),
            makeBudget({
                year: 2027,
                interventions: [
                    makeIntervention({
                        id: 1,
                        cost_breakdown: [
                            makeCostLine({
                                cost_unit_name: 'Net',
                                quantity: 50,
                                total_cost: 110,
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        const lines = merged.interventions[0].cost_breakdown ?? [];
        const net = lines.find(l => l.cost_unit_name === 'Net');
        const kit = lines.find(l => l.cost_unit_name === 'Kit');
        expect(net).toMatchObject({ quantity: 150, total_cost: 310 });
        expect(kit).toMatchObject({ quantity: 3, total_cost: 30 });
    });

    it('keeps distinct population layers separate when merging across years', () => {
        const merged = mergeBudgets([
            makeBudget({
                year: 2026,
                interventions: [
                    makeIntervention({
                        id: 1,
                        cost_breakdown: [
                            makeCostLine({
                                target_population_layer_id: 10,
                                total_cost: 100,
                            }),
                            makeCostLine({
                                target_population_layer_id: 20,
                                total_cost: 40,
                            }),
                        ],
                    }),
                ],
            }),
            makeBudget({
                year: 2027,
                interventions: [
                    makeIntervention({
                        id: 1,
                        cost_breakdown: [
                            makeCostLine({
                                target_population_layer_id: 10,
                                total_cost: 25,
                            }),
                        ],
                    }),
                ],
            }),
        ]);
        const lines = merged.interventions[0].cost_breakdown ?? [];
        const layer10 = lines.find(l => l.target_population_layer_id === 10);
        const layer20 = lines.find(l => l.target_population_layer_id === 20);
        expect(layer10?.total_cost).toBe(125);
        expect(layer20?.total_cost).toBe(40);
    });

    it('feeds the standard per-slot aggregators a budget equivalent to summing each year', () => {
        const budgets = [
            makeBudget({
                year: 2026,
                org_units_costs: [
                    makeOrgUnitCost({
                        org_unit_id: 1,
                        total_cost: 30,
                        interventions: [
                            makeIntervention({ id: 1, total_cost: 30 }),
                        ],
                    }),
                ],
            }),
            makeBudget({
                year: 2027,
                org_units_costs: [
                    makeOrgUnitCost({
                        org_unit_id: 1,
                        total_cost: 20,
                        interventions: [
                            makeIntervention({ id: 1, total_cost: 20 }),
                        ],
                    }),
                ],
            }),
        ];
        const costs = aggregateInterventionCosts(
            aggregateOrgUnitCosts([mergeBudgets(budgets)]),
        );
        expect(costs).toEqual([
            expect.objectContaining({ id: 1, total_cost: 50 }),
        ]);
    });
});
