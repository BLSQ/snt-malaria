import { InterventionCostBreakdownLine } from '../../interventions/types';
import { RuleCostLineOverride } from '../types/scenarioRule';
import { emptyCostLineOverride, resolveCostLineValue } from './override-utils';

const line = (
    overrides: Partial<InterventionCostBreakdownLine> = {},
): InterventionCostBreakdownLine => ({
    id: 1,
    name: 'Nets',
    category: 'Procurement',
    category_label: 'Procurement',
    unit_type: 'net',
    unit_type_label: 'Net',
    unit_cost: 2.5,
    intervention: 10,
    population_layer: null,
    population_layer_label: null,
    is_proportional: true,
    conversion_factor: '1.8',
    invert_conversion_factor: false,
    coverage: '80',
    buffer: null,
    ...overrides,
});

const override = (
    values: Partial<RuleCostLineOverride> = {},
): RuleCostLineOverride => ({ ...emptyCostLineOverride(1), ...values });

describe('resolveCostLineValue', () => {
    it('uses the cost item value when the rule sets nothing', () => {
        expect(
            resolveCostLineValue(line(), undefined, 'unit_cost', 2026, 10),
        ).toEqual({ value: 2.5, isRuleValue: false });
    });

    it('prefers the rule value over the cost item value', () => {
        expect(
            resolveCostLineValue(
                line(),
                override({ unit_cost: 3 }),
                'unit_cost',
                2026,
                10,
            ),
        ).toEqual({ value: 3, isRuleValue: true });
    });

    it('prefers the yearly coverage over the all-years coverage', () => {
        const costLineOverride = override({
            coverage: 70,
            yearly_coverage: { '2027': 50 },
        });
        expect(
            resolveCostLineValue(
                line(),
                costLineOverride,
                'coverage',
                2027,
                10,
            ),
        ).toEqual({ value: 50, isRuleValue: true });
        expect(
            resolveCostLineValue(
                line(),
                costLineOverride,
                'coverage',
                2026,
                10,
            ),
        ).toEqual({ value: 70, isRuleValue: true });
    });

    it('falls back to the budget settings buffer', () => {
        expect(
            resolveCostLineValue(line(), undefined, 'buffer', 2026, 10),
        ).toEqual({ value: 10, isRuleValue: false });
    });

    it('has no conversion factor for fixed cost items', () => {
        expect(
            resolveCostLineValue(
                line({ is_proportional: false }),
                undefined,
                'conversion_factor',
                2026,
                10,
            ),
        ).toEqual({ value: null, isRuleValue: false });
    });
});
