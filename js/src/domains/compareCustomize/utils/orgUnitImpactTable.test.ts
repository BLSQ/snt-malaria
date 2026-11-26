import { BudgetCalculationResponse } from '../../planning/types/budget';
import { MetricKey, ScenarioImpactMetrics } from '../types';
import {
    buildOrgUnitImpactRows,
    indexOrgUnitMetrics,
} from './orgUnitImpactTable';

const metric = (value: number | null) => ({ value, lower: null, upper: null });

const impact = (
    orgUnits: { id: number; cases: number | null }[],
): ScenarioImpactMetrics =>
    ({
        org_units: orgUnits.map(({ id, cases }) => ({
            org_unit_id: id,
            org_unit_name: `OU ${id}`,
            number_cases: metric(cases),
        })),
    }) as unknown as ScenarioImpactMetrics;

const budget = (costs: { id: number; cost: number }[][]) =>
    ({
        results: costs.map(year => ({
            org_units_costs: year.map(({ id, cost }) => ({
                org_unit_id: id,
                total_cost: cost,
            })),
        })),
    }) as unknown as BudgetCalculationResponse;

describe('buildOrgUnitImpactRows', () => {
    it('reads impact values and cumulative costs for both scenarios', () => {
        const rows = buildOrgUnitImpactRows({
            orgUnitId: 1,
            metrics: [MetricKey.Cases, MetricKey.OrgUnitTotalCost],
            baseline: indexOrgUnitMetrics(
                impact([{ id: 1, cases: 100 }]),
                budget([[{ id: 1, cost: 10 }], [{ id: 1, cost: 5 }]]),
            ),
            scenario: indexOrgUnitMetrics(
                impact([{ id: 1, cases: 80 }]),
                budget([[{ id: 1, cost: 30 }]]),
            ),
        });

        expect(rows).toEqual([
            { metric: MetricKey.Cases, baseline: 100, scenario: 80 },
            {
                metric: MetricKey.OrgUnitTotalCost,
                baseline: 15,
                scenario: 30,
            },
        ]);
    });

    it('leaves out metrics without a value in either scenario', () => {
        const rows = buildOrgUnitImpactRows({
            orgUnitId: 1,
            metrics: [MetricKey.Cases, MetricKey.SevereCases],
            baseline: indexOrgUnitMetrics(impact([{ id: 1, cases: null }])),
        });

        expect(rows).toEqual([]);
    });

    it('keeps baseline-only rows when no scenario is compared', () => {
        const rows = buildOrgUnitImpactRows({
            orgUnitId: 2,
            metrics: [MetricKey.Cases],
            baseline: indexOrgUnitMetrics(impact([{ id: 2, cases: 42 }])),
        });

        expect(rows).toEqual([
            { metric: MetricKey.Cases, baseline: 42, scenario: undefined },
        ]);
    });
});
