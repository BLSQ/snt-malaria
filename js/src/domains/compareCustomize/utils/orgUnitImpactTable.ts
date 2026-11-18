import { BudgetCalculationResponse } from '../../planning/types/budget';
import {
    MetricKey,
    OrgUnitImpactMetrics,
    ScenarioImpactMetrics,
} from '../types';
import { getOrgUnitCumulativeCostsMap } from './impactCalculations';

export type OrgUnitMetricSource = {
    impactByOrgUnitId: Map<number, OrgUnitImpactMetrics>;
    costByOrgUnitId: Map<number, number>;
};

export type OrgUnitImpactRow = {
    metric: MetricKey;
    baseline?: number;
    scenario?: number;
};

export const indexOrgUnitMetrics = (
    impact?: ScenarioImpactMetrics,
    budget?: BudgetCalculationResponse,
): OrgUnitMetricSource => ({
    impactByOrgUnitId: new Map(
        (impact?.org_units ?? []).map(orgUnit => [
            orgUnit.org_unit_id,
            orgUnit,
        ]),
    ),
    costByOrgUnitId: getOrgUnitCumulativeCostsMap(budget),
});

const getOrgUnitMetricValue = (
    source: OrgUnitMetricSource | undefined,
    orgUnitId: number,
    metric: MetricKey,
): number | undefined => {
    if (!source) return undefined;
    if (metric === MetricKey.OrgUnitTotalCost) {
        return source.costByOrgUnitId.get(orgUnitId);
    }
    return (
        source.impactByOrgUnitId.get(orgUnitId)?.[metric]?.value ?? undefined
    );
};

/** One row per metric with a value in either scenario, in `metrics` order. */
export const buildOrgUnitImpactRows = ({
    orgUnitId,
    metrics,
    baseline,
    scenario,
}: {
    orgUnitId: number;
    metrics: MetricKey[];
    baseline?: OrgUnitMetricSource;
    scenario?: OrgUnitMetricSource;
}): OrgUnitImpactRow[] =>
    metrics
        .map(metric => ({
            metric,
            baseline: getOrgUnitMetricValue(baseline, orgUnitId, metric),
            scenario: getOrgUnitMetricValue(scenario, orgUnitId, metric),
        }))
        .filter(
            row => row.baseline !== undefined || row.scenario !== undefined,
        );
