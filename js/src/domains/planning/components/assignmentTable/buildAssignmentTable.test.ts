import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import {
    InterventionCategory,
    InterventionCostBreakdownLine,
} from '../../../interventions/types';
import { NormalizedAssignment } from '../interventionPlanMap/buildEffectiveAssignments';
import {
    AssignmentRuleSource,
    buildAssignmentTable,
    filterAssignmentRows,
    flattenColumns,
} from './buildAssignmentTable';

const orgUnits = [
    { id: 1, name: 'Bobo', parent_name: 'Hauts-Bassins' },
    { id: 2, name: 'Arbinda', parent_name: 'Sahel' },
    { id: 3, name: 'Cascades', parent_name: 'Sud' },
] as unknown as OrgUnit[];

const interventionCategories = [
    {
        id: 1,
        name: 'Chemoprevention',
        short_name: 'Chemo',
        interventions: [
            { id: 10, name: 'SMC', short_name: 'SMC' },
            { id: 11, name: 'PMC', short_name: 'PMC' },
        ],
    },
    {
        id: 2,
        name: 'Vector control',
        short_name: 'VC',
        interventions: [{ id: 20, name: 'ITN', short_name: 'ITN' }],
    },
] as unknown as InterventionCategory[];

const costLines = [
    {
        id: 100,
        name: 'SP+AQ',
        intervention: 10,
        unit_cost: 0.4,
        is_proportional: true,
        conversion_factor: '1',
        coverage: '100',
        buffer: null,
    },
    {
        id: 101,
        name: 'Distribution',
        intervention: 10,
        unit_cost: 1.2,
        is_proportional: true,
        conversion_factor: '1',
        coverage: '100',
        buffer: null,
    },
] as unknown as InterventionCostBreakdownLine[];

const ruleA: AssignmentRuleSource = {
    id: 1,
    name: 'Rule A',
    color: '#673AB7',
    intervention_overrides: [
        {
            intervention: 10,
            deployment_years: [2026],
            grant: null,
            cost_lines: [
                {
                    cost_line: 101,
                    unit_cost: 2,
                    conversion_factor: null,
                    buffer: null,
                    coverage: null,
                    yearly_coverage: {},
                },
            ],
        },
    ],
};
const ruleB: AssignmentRuleSource = {
    id: 2,
    name: 'Rule B',
    color: '#EC407A',
    intervention_overrides: [],
};

const assignments: NormalizedAssignment[] = [
    { orgUnitId: 1, interventionId: 10, ruleId: 1, ruleColor: ruleA.color },
    { orgUnitId: 1, interventionId: 20, ruleId: 2, ruleColor: ruleB.color },
    { orgUnitId: 2, interventionId: 20, ruleId: 2, ruleColor: ruleB.color },
];

const build = (overrides = {}) =>
    buildAssignmentTable({
        assignments,
        orgUnits,
        rules: [ruleA, ruleB],
        interventionCategories,
        costLines,
        scenarioYears: [2026, 2027],
        year: 2026,
        mode: 'interventions',
        field: 'unit_cost',
        defaultBufferPercent: 10,
        ...overrides,
    });

describe('buildAssignmentTable', () => {
    it('only adds columns for assigned interventions, in category order', () => {
        const table = build();
        expect(table.groups.map(group => group.intervention.name)).toEqual([
            'SMC',
            'ITN',
        ]);
        expect(table.groups[0].categoryName).toBe('Chemoprevention');
        expect(table.groups.map(group => group.startIndex)).toEqual([0, 1]);
    });

    it('lists every org unit sorted by name, with its region', () => {
        const table = build();
        expect(table.rows.map(row => row.name)).toEqual([
            'Arbinda',
            'Bobo',
            'Cascades',
        ]);
        expect(table.rows[1].regionName).toBe('Hauts-Bassins');
        expect(table.assignedCount).toBe(2);
        expect(table.rows[2].isAssigned).toBe(false);
    });

    it('marks each cell with its source rule and deployment for the year', () => {
        const bobo = build().rows[1];
        expect(bobo.cells[0].rule?.color).toBe(ruleA.color);
        expect(bobo.cells[0].isDeployed).toBe(true);
        expect(bobo.cells[0].isOverridden).toBe(true);
        expect(bobo.cells[0].overrideCount).toBe(1);
        expect(bobo.cells[1].rule?.color).toBe(ruleB.color);
        expect(bobo.cells[1].isOverridden).toBe(false);

        const boboIn2027 = build({ year: 2027 }).rows[1];
        expect(boboIn2027.cells[0].isDeployed).toBe(false);
        expect(boboIn2027.cells[0].isOverridden).toBe(false);
        expect(boboIn2027.cells[0].overrideCount).toBe(0);
        expect(boboIn2027.cells[1].isDeployed).toBe(true);
    });

    it('splits interventions into cost items with resolved values', () => {
        const table = build({ mode: 'costItems' });
        expect(table.groups[0].columns).toHaveLength(2);
        expect(table.groups[1].columns).toHaveLength(1);
        expect(table.groups[1].startIndex).toBe(2);
        const [inherited, overridden, itn] = table.rows[1].cells;
        expect(inherited).toMatchObject({ value: 0.4, isRuleValue: false });
        expect(overridden).toMatchObject({ value: 2, isRuleValue: true });
        expect(itn.value).toBeNull();
    });

    it('leaves cost item values empty in years the intervention is not deployed', () => {
        const [inherited] = build({ mode: 'costItems', year: 2027 }).rows[1]
            .cells;
        expect(inherited).toMatchObject({ isDeployed: false, value: null });
    });
});

describe('filterAssignmentRows', () => {
    it('filters by deployment, overrides and district or region search', () => {
        const { rows } = build();
        expect(
            filterAssignmentRows(rows, 'deployed', '').map(row => row.name),
        ).toEqual(['Arbinda', 'Bobo']);
        expect(
            filterAssignmentRows(rows, 'overridden', '').map(row => row.name),
        ).toEqual(['Bobo']);
        expect(
            filterAssignmentRows(rows, 'all', 'sahel').map(row => row.name),
        ).toEqual(['Arbinda']);
    });
});

describe('flattenColumns', () => {
    it('labels cost item columns with their intervention and marks group edges', () => {
        const columns = flattenColumns(build({ mode: 'costItems' }).groups);
        expect(columns.map(column => column.label)).toEqual([
            'SMC, SP+AQ',
            'SMC, Distribution',
            'ITN',
        ]);
        expect(columns[0]).toMatchObject({
            isFirstInGroup: true,
            isLastInGroup: false,
        });
        expect(columns[2]).toMatchObject({
            isFirstInGroup: true,
            isLastInGroup: true,
        });
    });
});
