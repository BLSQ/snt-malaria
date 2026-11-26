import React, { useCallback, useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { GetMapHoverCardActions } from '../../../../components/hoverCard/MapHoverCard';
import { MESSAGES } from '../../../messages';
import { useComparisonDataContext } from '../../ComparisonDataContext';
import { MetricKey } from '../../types';
import { useMetricConfig } from '../../utils/metricConfig';
import {
    buildOrgUnitImpactRows,
    indexOrgUnitMetrics,
} from '../../utils/orgUnitImpactTable';
import { ImpactDetailsTable } from './ImpactDetailsTable';

export const useImpactDetailsExpansion = ({
    scenarioId,
    highlightedMetric,
}: {
    scenarioId: number | undefined;
    highlightedMetric?: MetricKey;
}): GetMapHoverCardActions => {
    const { formatMessage } = useSafeIntl();
    const {
        scenarios,
        baselineScenarioId,
        impactsByScenarioId,
        budgetsByScenarioId,
    } = useComparisonDataContext();
    const metricConfig = useMetricConfig();
    const metrics = useMemo(
        () => Object.keys(metricConfig) as MetricKey[],
        [metricConfig],
    );
    const isBaseline = scenarioId === baselineScenarioId;
    const baselineScenario = scenarios.find(
        ({ id }) => id === baselineScenarioId,
    );
    const scenario = isBaseline
        ? undefined
        : scenarios.find(({ id }) => id === scenarioId);

    const indexScenario = useCallback(
        (id: number | undefined) =>
            id === undefined
                ? undefined
                : indexOrgUnitMetrics(
                      impactsByScenarioId.get(id),
                      budgetsByScenarioId.get(id),
                  ),
        [impactsByScenarioId, budgetsByScenarioId],
    );
    const baselineSource = useMemo(
        () => indexScenario(baselineScenarioId),
        [indexScenario, baselineScenarioId],
    );
    const scenarioSource = useMemo(
        () => (isBaseline ? undefined : indexScenario(scenarioId)),
        [indexScenario, isBaseline, scenarioId],
    );

    return useCallback(
        ({ id: orgUnitId }: OrgUnit) => {
            if (!baselineScenario || (!isBaseline && !scenario)) return {};
            return {
                hint: formatMessage(MESSAGES.tooltipClickForImpactDetails),
                expansion: {
                    title: formatMessage(
                        isBaseline
                            ? MESSAGES.tooltipBaselineImpact
                            : MESSAGES.tooltipImpactComparedToBaseline,
                    ),
                    content: ({ side }) => (
                        <ImpactDetailsTable
                            rows={buildOrgUnitImpactRows({
                                orgUnitId,
                                metrics,
                                baseline: baselineSource,
                                scenario: scenarioSource,
                            })}
                            baseline={baselineScenario}
                            scenario={scenario}
                            highlightedMetric={highlightedMetric}
                            side={side}
                        />
                    ),
                },
            };
        },
        [
            baselineScenario,
            scenario,
            isBaseline,
            metrics,
            baselineSource,
            scenarioSource,
            highlightedMetric,
            formatMessage,
        ],
    );
};
