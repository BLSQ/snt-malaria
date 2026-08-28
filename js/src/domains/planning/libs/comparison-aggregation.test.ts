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
    InterventionSlotRow,
} from '../types/comparisonAggregation';
import { PROCUREMENT_CATEGORY } from './budget-aggregation';
import {
    getSharedInterventionOrderByCategory,
    getSlotCommoditiesByIntervention,
    getSlotInterventionCosts,
    getSlotInterventionCoverage,
    getSlotInterventionDistrictCoverage,
    getSlotTotalCost,
    mergeCommodityRowsBySlot,
    mergeCoverageRowsBySlot,
    mergeInterventionCostDeltas,
    mergeSlotRowsByIntervention,
    mergeSlotYearlyCostsByYear,
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

describe('mergeSlotYearlyCostsByYear', () => {
    it('unions per-slot yearly costs into rows ordered by year, keyed by slot', () => {
        expect(
            mergeSlotYearlyCostsByYear(
                new Map([
                    [
                        'slot-0',
                        [
                            { year: 2026, totalCost: 200 },
                            { year: 2025, totalCost: 100 },
                        ],
                    ],
                    ['slot-1', [{ year: 2026, totalCost: 500 }]],
                ]),
            ),
        ).toEqual([
            { year: 2025, 'slot-0': 100 },
            { year: 2026, 'slot-0': 200, 'slot-1': 500 },
        ]);
    });

    it('returns an empty array when no slot has any yearly costs', () => {
        expect(
            mergeSlotYearlyCostsByYear(
                new Map([
                    ['slot-0', []],
                    ['slot-1', []],
                ]),
            ),
        ).toEqual([]);
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

    it('only sums org units in orgUnitIds when it is provided', () => {
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

        expect(getSlotInterventionCosts(budget, new Set([1]))).toEqual([
            expect.objectContaining({ id: 1, total_cost: 100 }),
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

    it('only counts org units in orgUnitIds when it is provided', () => {
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

        expect(
            getSlotInterventionDistrictCoverage(budget, new Set([1])),
        ).toEqual([
            {
                interventionId: 1,
                interventionLabel: 'Bed nets',
                districtCount: 1,
            },
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

describe('mergeInterventionCostDeltas', () => {
    it('computes each compared slot delta vs the base, ordered by base cost', () => {
        const base = [
            makeIntervention({ id: 1, type: 'Bed nets', total_cost: 100 }),
            makeIntervention({ id: 2, type: 'IRS', total_cost: 500 }),
        ];
        const comparedCostsBySlotKey = new Map([
            [
                'slot-1',
                [
                    makeIntervention({
                        id: 1,
                        type: 'Bed nets',
                        total_cost: 130,
                    }),
                    makeIntervention({ id: 2, type: 'IRS', total_cost: 400 }),
                ],
            ],
            [
                'slot-2',
                [
                    makeIntervention({
                        id: 1,
                        type: 'Bed nets',
                        total_cost: 90,
                    }),
                    // intervention 3 is new in this scenario, absent from base
                    makeIntervention({ id: 3, type: 'SMC', total_cost: 60 }),
                ],
            ],
        ]);

        expect(
            mergeInterventionCostDeltas(base, comparedCostsBySlotKey),
        ).toEqual([
            // IRS first: largest base cost
            {
                interventionId: 2,
                interventionLabel: 'IRS',
                deltaBySlotKey: { 'slot-1': -100, 'slot-2': -500 },
            },
            {
                interventionId: 1,
                interventionLabel: 'Bed nets',
                deltaBySlotKey: { 'slot-1': 30, 'slot-2': -10 },
            },
            {
                interventionId: 3,
                interventionLabel: 'SMC',
                deltaBySlotKey: { 'slot-1': 0, 'slot-2': 60 },
            },
        ]);
    });

    it('returns an empty array when no scenario has intervention costs', () => {
        expect(mergeInterventionCostDeltas([], new Map())).toEqual([]);
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
