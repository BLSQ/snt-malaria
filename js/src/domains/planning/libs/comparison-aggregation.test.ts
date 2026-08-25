import {
    Budget,
    BudgetInterventionCostLine,
    BudgetIntervention,
    BudgetOrgUnit,
} from '../types/budget';
import {
    InterventionCommodities,
    InterventionCostIdentity,
    InterventionCoverage,
    InterventionIdentity,
    InterventionSlotRow,
} from '../types/comparisonAggregation';
import { PROCUREMENT_CATEGORY } from './budget-aggregation';
import {
    alignToSharedOrder,
    getSharedInterventionOrder,
    getSharedInterventionOrderByCategory,
    getSlotCommoditiesByIntervention,
    getSlotInterventionCosts,
    getSlotInterventionCoverage,
    getSlotInterventionDistrictCoverage,
    getSlotTotalCost,
    mergeCommodityRowsBySlot,
    mergeCoverageRowsBySlot,
    mergeSlotRowsByIntervention,
} from './comparison-aggregation';

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

describe('getSlotTotalCost', () => {
    it('returns the budget total cost', () => {
        expect(getSlotTotalCost(makeBudget({ total_cost: 1234 }))).toBe(1234);
    });

    it('returns undefined for an undefined budget', () => {
        expect(getSlotTotalCost(undefined)).toBeUndefined();
    });
});

describe('getSlotInterventionCosts', () => {
    it('returns an empty array for an undefined budget', () => {
        expect(getSlotInterventionCosts(undefined)).toEqual([]);
    });

    it('sums intervention costs across org units, sorted by cost descending', () => {
        const budget = makeBudget({
            org_units_costs: [
                makeOrgUnitCost({
                    org_unit_id: 1,
                    interventions: [
                        makeIntervention({
                            id: 1,
                            type: 'Bed nets',
                            total_cost: 100,
                        }),
                        makeIntervention({
                            id: 2,
                            type: 'IRS',
                            total_cost: 500,
                        }),
                    ],
                }),
                makeOrgUnitCost({
                    org_unit_id: 2,
                    interventions: [
                        makeIntervention({
                            id: 1,
                            type: 'Bed nets',
                            total_cost: 50,
                        }),
                    ],
                }),
            ],
        });

        expect(getSlotInterventionCosts(budget)).toEqual([
            expect.objectContaining({ id: 2, total_cost: 500 }),
            expect.objectContaining({ id: 1, total_cost: 150 }),
        ]);
    });
});

describe('getSlotInterventionCoverage', () => {
    it('returns an empty array for an undefined budget', () => {
        expect(getSlotInterventionCoverage(undefined)).toEqual([]);
    });

    it('extracts population layer coverage from proportional procurement lines', () => {
        const budget = makeBudget({
            interventions: [
                makeIntervention({
                    id: 1,
                    type: 'Bed nets',
                    cost_breakdown: [
                        makeCostLine({
                            is_proportional: true,
                            category: PROCUREMENT_CATEGORY,
                            target_population_layer_id: 10,
                            target_population: 'Under-5',
                            population: 1000,
                            yearly_value: 0.78,
                        }),
                    ],
                }),
            ],
        });

        expect(getSlotInterventionCoverage(budget)).toEqual([
            {
                interventionId: 1,
                interventionLabel: 'Bed nets',
                layers: [
                    {
                        layerId: 10,
                        layerName: 'Under-5',
                        personsAtRisk: 1000,
                        percentEligible: 0.78,
                    },
                ],
            },
        ]);
    });

    it('ignores lines that are not proportional, not procurement, or have no population layer', () => {
        const budget = makeBudget({
            interventions: [
                makeIntervention({
                    id: 1,
                    cost_breakdown: [
                        makeCostLine({
                            is_proportional: false,
                            category: PROCUREMENT_CATEGORY,
                            target_population_layer_id: 10,
                            target_population: 'Under-5',
                        }),
                        makeCostLine({
                            is_proportional: true,
                            category: 'Fixed',
                            target_population_layer_id: 10,
                            target_population: 'Under-5',
                        }),
                        makeCostLine({
                            is_proportional: true,
                            category: PROCUREMENT_CATEGORY,
                            target_population_layer_id: null,
                            target_population: 'Under-5',
                        }),
                        makeCostLine({
                            is_proportional: true,
                            category: PROCUREMENT_CATEGORY,
                            target_population_layer_id: 10,
                            target_population: null,
                        }),
                    ],
                }),
            ],
        });

        expect(getSlotInterventionCoverage(budget)).toEqual([]);
    });

    it('keeps only the first line seen for a given population layer', () => {
        const budget = makeBudget({
            interventions: [
                makeIntervention({
                    id: 1,
                    cost_breakdown: [
                        makeCostLine({
                            is_proportional: true,
                            category: PROCUREMENT_CATEGORY,
                            target_population_layer_id: 10,
                            target_population: 'Under-5',
                            population: 1000,
                            yearly_value: 0.5,
                        }),
                        makeCostLine({
                            is_proportional: true,
                            category: PROCUREMENT_CATEGORY,
                            target_population_layer_id: 10,
                            target_population: 'Under-5',
                            population: 9999,
                            yearly_value: 0.9,
                        }),
                    ],
                }),
            ],
        });

        expect(getSlotInterventionCoverage(budget)[0].layers).toEqual([
            expect.objectContaining({
                personsAtRisk: 1000,
                percentEligible: 0.5,
            }),
        ]);
    });
});

describe('mergeCoverageRowsBySlot', () => {
    it('unions per-slot coverage into one row per intervention/layer pair, sorted by intervention then layer name', () => {
        const coverageA: InterventionCoverage[] = [
            {
                interventionId: 2,
                interventionLabel: 'IRS',
                layers: [
                    {
                        layerId: 20,
                        layerName: 'General population',
                        personsAtRisk: 500,
                        percentEligible: 0.6,
                    },
                ],
            },
            {
                interventionId: 1,
                interventionLabel: 'Bed nets',
                layers: [
                    {
                        layerId: 11,
                        layerName: 'Pregnant women',
                        personsAtRisk: 200,
                        percentEligible: 0.9,
                    },
                    {
                        layerId: 10,
                        layerName: 'Under-5',
                        personsAtRisk: 1000,
                        percentEligible: 0.78,
                    },
                ],
            },
        ];
        const coverageB: InterventionCoverage[] = [
            {
                interventionId: 1,
                interventionLabel: 'Bed nets',
                layers: [
                    {
                        layerId: 10,
                        layerName: 'Under-5',
                        personsAtRisk: 1100,
                        percentEligible: 0.8,
                    },
                ],
            },
        ];

        const rows = mergeCoverageRowsBySlot(
            new Map([
                ['slotA', coverageA],
                ['slotB', coverageB],
            ]),
        );

        expect(rows).toEqual([
            expect.objectContaining({
                interventionId: 1,
                layerId: 11,
                layerName: 'Pregnant women',
                cellBySlotKey: {
                    slotA: { personsAtRisk: 200, percentEligible: 0.9 },
                },
            }),
            expect.objectContaining({
                interventionId: 1,
                layerId: 10,
                layerName: 'Under-5',
                cellBySlotKey: {
                    slotA: { personsAtRisk: 1000, percentEligible: 0.78 },
                    slotB: { personsAtRisk: 1100, percentEligible: 0.8 },
                },
            }),
            expect.objectContaining({
                interventionId: 2,
                layerId: 20,
                layerName: 'General population',
                cellBySlotKey: {
                    slotA: { personsAtRisk: 500, percentEligible: 0.6 },
                },
            }),
        ]);
    });
});

describe('getSlotInterventionDistrictCoverage', () => {
    it('returns an empty array for an undefined budget', () => {
        expect(getSlotInterventionDistrictCoverage(undefined)).toEqual([]);
    });

    it('counts distinct org units covered per intervention', () => {
        const budget = makeBudget({
            org_units_costs: [
                makeOrgUnitCost({
                    org_unit_id: 1,
                    interventions: [
                        makeIntervention({ id: 1, type: 'Bed nets' }),
                    ],
                }),
                makeOrgUnitCost({
                    org_unit_id: 2,
                    interventions: [
                        makeIntervention({ id: 1, type: 'Bed nets' }),
                        makeIntervention({ id: 2, type: 'IRS' }),
                    ],
                }),
            ],
        });

        expect(getSlotInterventionDistrictCoverage(budget)).toEqual([
            {
                interventionId: 1,
                interventionLabel: 'Bed nets',
                districtCount: 2,
            },
            { interventionId: 2, interventionLabel: 'IRS', districtCount: 1 },
        ]);
    });
});

describe('getSharedInterventionOrder', () => {
    it('unions intervention identities across slots, sorted alphabetically by label', () => {
        const rowsBySlotIndex: InterventionIdentity[][] = [
            [
                { interventionId: 2, interventionLabel: 'IRS' },
                { interventionId: 1, interventionLabel: 'Bed nets' },
            ],
            [{ interventionId: 3, interventionLabel: 'ACT' }],
        ];

        expect(getSharedInterventionOrder(rowsBySlotIndex)).toEqual([
            { interventionId: 3, interventionLabel: 'ACT' },
            { interventionId: 1, interventionLabel: 'Bed nets' },
            { interventionId: 2, interventionLabel: 'IRS' },
        ]);
    });

    it('keeps the first-seen identity for a duplicate intervention id', () => {
        const rowsBySlotIndex: InterventionIdentity[][] = [
            [{ interventionId: 1, interventionLabel: 'Bed nets (old label)' }],
            [{ interventionId: 1, interventionLabel: 'Bed nets (new label)' }],
        ];

        expect(getSharedInterventionOrder(rowsBySlotIndex)).toEqual([
            { interventionId: 1, interventionLabel: 'Bed nets (old label)' },
        ]);
    });
});

describe('getSharedInterventionOrderByCategory', () => {
    it('sums cost across slots and orders by category cost then intervention cost', () => {
        const rowsBySlotIndex: InterventionCostIdentity[][] = [
            [
                { interventionId: 1, interventionLabel: 'Bed nets', cost: 100 },
                { interventionId: 2, interventionLabel: 'IRS', cost: 50 },
            ],
            [{ interventionId: 3, interventionLabel: 'ACT', cost: 1000 }],
        ];
        const categoryIdByInterventionId = new Map([
            [1, 1],
            [2, 1],
            [3, 2],
        ]);

        expect(
            getSharedInterventionOrderByCategory(
                rowsBySlotIndex,
                categoryIdByInterventionId,
            ),
        ).toEqual([
            { interventionId: 3, interventionLabel: 'ACT' },
            { interventionId: 1, interventionLabel: 'Bed nets' },
            { interventionId: 2, interventionLabel: 'IRS' },
        ]);
    });
});

describe('alignToSharedOrder', () => {
    const sharedOrder: InterventionIdentity[] = [
        { interventionId: 1, interventionLabel: 'Bed nets' },
        { interventionId: 2, interventionLabel: 'IRS' },
    ];

    it('reorders rows to match the shared order, filling gaps with a placeholder', () => {
        const rowsBySlotIndex = [[{ interventionId: 2, value: 50 }]];

        const result = alignToSharedOrder(
            rowsBySlotIndex,
            sharedOrder,
            row => row.interventionId,
            identity => ({ interventionId: identity.interventionId, value: 0 }),
        );

        expect(result).toEqual([
            [
                { interventionId: 1, value: 0 },
                { interventionId: 2, value: 50 },
            ],
        ]);
    });

    it('leaves an empty slot empty instead of filling it with placeholders', () => {
        const result = alignToSharedOrder(
            [[]],
            sharedOrder,
            (row: { interventionId: number }) => row.interventionId,
            identity => ({ interventionId: identity.interventionId, value: 0 }),
        );

        expect(result).toEqual([[]]);
    });
});

describe('mergeSlotRowsByIntervention', () => {
    it('unions per-slot rows into one row per intervention, zero-filling missing slots', () => {
        const rowsBySlotKey = new Map<string, InterventionSlotRow[]>([
            [
                'slotA',
                [
                    {
                        interventionId: 1,
                        interventionLabel: 'Bed nets',
                        value: 100,
                    },
                    { interventionId: 2, interventionLabel: 'IRS', value: 50 },
                ],
            ],
            [
                'slotB',
                [
                    {
                        interventionId: 1,
                        interventionLabel: 'Bed nets',
                        value: 120,
                    },
                ],
            ],
        ]);

        expect(mergeSlotRowsByIntervention(rowsBySlotKey)).toEqual([
            {
                interventionId: 1,
                interventionLabel: 'Bed nets',
                valueBySlotKey: { slotA: 100, slotB: 120 },
            },
            {
                interventionId: 2,
                interventionLabel: 'IRS',
                valueBySlotKey: { slotA: 50, slotB: 0 },
            },
        ]);
    });
});

describe('mergeCommodityRowsBySlot', () => {
    it('unions per-slot commodities into one row per intervention/unit pair, sorted by intervention then unit name', () => {
        const commoditiesA: InterventionCommodities[] = [
            {
                interventionId: 1,
                interventionLabel: 'Bed nets',
                commodities: [
                    {
                        unitName: 'Net',
                        quantity: 100,
                        unitCost: 2,
                        totalCost: 200,
                    },
                ],
            },
        ];
        const commoditiesB: InterventionCommodities[] = [
            {
                interventionId: 1,
                interventionLabel: 'Bed nets',
                commodities: [
                    {
                        unitName: 'Net',
                        quantity: 120,
                        unitCost: 2,
                        totalCost: 240,
                    },
                ],
            },
        ];

        const rows = mergeCommodityRowsBySlot(
            new Map([
                ['slotA', commoditiesA],
                ['slotB', commoditiesB],
            ]),
        );

        expect(rows).toEqual([
            {
                interventionId: 1,
                interventionLabel: 'Bed nets',
                unitName: 'Net',
                cellBySlotKey: {
                    slotA: { quantity: 100, unitCost: 2, totalCost: 200 },
                    slotB: { quantity: 120, unitCost: 2, totalCost: 240 },
                },
            },
        ]);
    });
});

describe('getSlotCommoditiesByIntervention', () => {
    it('returns an empty array for an undefined budget', () => {
        expect(getSlotCommoditiesByIntervention(undefined, new Set())).toEqual(
            [],
        );
    });

    it('aggregates procurement lines matching the given unit names, summed per unit', () => {
        const budget = makeBudget({
            interventions: [
                makeIntervention({
                    id: 1,
                    type: 'Bed nets',
                    cost_breakdown: [
                        makeCostLine({
                            category: PROCUREMENT_CATEGORY,
                            cost_unit_name: 'Net',
                            quantity: 100,
                            unit_cost: 2,
                            total_cost: 200,
                        }),
                        makeCostLine({
                            category: PROCUREMENT_CATEGORY,
                            cost_unit_name: 'Net',
                            quantity: 50,
                            unit_cost: 2,
                            total_cost: 100,
                        }),
                        makeCostLine({
                            category: 'Fixed',
                            cost_unit_name: 'Net',
                            quantity: 999,
                        }),
                        makeCostLine({
                            category: PROCUREMENT_CATEGORY,
                            cost_unit_name: 'Spray',
                            quantity: 30,
                        }),
                    ],
                }),
            ],
        });

        expect(
            getSlotCommoditiesByIntervention(budget, new Set(['Net'])),
        ).toEqual([
            {
                interventionId: 1,
                interventionLabel: 'Bed nets',
                commodities: [
                    {
                        unitName: 'Net',
                        quantity: 150,
                        unitCost: 2,
                        totalCost: 300,
                    },
                ],
            },
        ]);
    });

    it('omits interventions with no matching commodity lines', () => {
        const budget = makeBudget({
            interventions: [
                makeIntervention({
                    id: 1,
                    cost_breakdown: [
                        makeCostLine({
                            category: PROCUREMENT_CATEGORY,
                            cost_unit_name: 'Spray',
                            quantity: 10,
                        }),
                    ],
                }),
            ],
        });

        expect(
            getSlotCommoditiesByIntervention(budget, new Set(['Net'])),
        ).toEqual([]);
    });
});
