import {
    Intervention,
    InterventionCategory,
    InterventionCostBreakdownLine,
} from '../../../interventions/types';
import { buildCostItemGroups, filterCostItemGroups } from './costItemGroups';

const makeIntervention = (id: number, name: string): Intervention => ({
    id,
    name,
    short_name: name,
    code: name,
    description: '',
    intervention_category: 1,
    target_population: [],
});

const makeLine = (
    id: number,
    intervention: number,
    name: string,
    categoryLabel = 'Procurement',
): InterventionCostBreakdownLine => ({
    id,
    intervention,
    name,
    category: categoryLabel,
    category_label: categoryLabel,
    unit_type: '1',
    unit_type_label: 'Item',
    unit_cost: 1,
    population_layer: null,
    population_layer_label: null,
    is_proportional: false,
    conversion_factor: 1,
    invert_conversion_factor: false,
    coverage: 100,
});

const categories: InterventionCategory[] = [
    {
        id: 1,
        name: 'Case Management',
        short_name: 'CM',
        description: '',
        interventions: [
            makeIntervention(10, 'CM'),
            makeIntervention(11, 'iCCM'),
        ],
    },
    {
        id: 2,
        name: 'Vaccination',
        short_name: 'VAC',
        description: '',
        interventions: [makeIntervention(20, 'R21')],
    },
];

const lines = [
    makeLine(1, 10, 'Diagnosis', 'Distribution'),
    makeLine(2, 10, 'Health worker training', 'Operational'),
    makeLine(3, 20, 'R21 Procurement'),
];

const groups = buildCostItemGroups(categories, lines);

describe('buildCostItemGroups', () => {
    it('creates one group per intervention, including interventions without lines', () => {
        expect(groups.map(group => group.intervention.id)).toEqual([
            10, 11, 20,
        ]);
        expect(groups[1].lines).toEqual([]);
        expect(groups[0].lines.map(line => line.id)).toEqual([1, 2]);
    });
});

describe('filterCostItemGroups', () => {
    it('keeps every group when no filter is set', () => {
        expect(
            filterCostItemGroups(groups, {
                search: '',
                interventionCategoryId: null,
            }),
        ).toEqual(groups);
    });

    it('filters groups by intervention category', () => {
        const result = filterCostItemGroups(groups, {
            search: '',
            interventionCategoryId: 2,
        });
        expect(result.map(group => group.intervention.id)).toEqual([20]);
    });

    it('narrows visible lines on search but keeps the full line list for saving', () => {
        const [result] = filterCostItemGroups(groups, {
            search: 'training',
            interventionCategoryId: null,
        });
        expect(result.visibleLines.map(line => line.id)).toEqual([2]);
        expect(result.lines.map(line => line.id)).toEqual([1, 2]);
    });

    it('matches the cost category label, case-insensitively', () => {
        const result = filterCostItemGroups(groups, {
            search: 'DISTRIBUTION',
            interventionCategoryId: null,
        });
        expect(result.map(group => group.intervention.id)).toEqual([10]);
        expect(result[0].visibleLines.map(line => line.id)).toEqual([1]);
    });

    it('shows every line of an intervention whose name matches the search', () => {
        const result = filterCostItemGroups(groups, {
            search: 'iccm',
            interventionCategoryId: null,
        });
        expect(result.map(group => group.intervention.id)).toEqual([11]);
    });
});
