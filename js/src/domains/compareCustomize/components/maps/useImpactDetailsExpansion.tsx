import React, { useCallback, useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { MapHoverCardActions } from '../../../../components/hoverCard/MapHoverCard';
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
}): ((orgUnitId: number) => MapHoverCardActions) => {
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

    const baselineSource = useMemo(
        () =>
            baselineScenarioId === undefined
                ? undefined
                : indexOrgUnitMetrics(
                      impactsByScenarioId.get(baselineScenarioId),
                      budgetsByScenarioId.get(baselineScenarioId),
                  ),
        [baselineScenarioId, impactsByScenarioId, budgetsByScenarioId],
    );
    const scenarioSource = useMemo(
        () =>
            isBaseline || scenarioId === undefined
                ? undefined
                : indexOrgUnitMetrics(
                      impactsByScenarioId.get(scenarioId),
                      budgetsByScenarioId.get(scenarioId),
                  ),
        [isBaseline, scenarioId, impactsByScenarioId, budgetsByScenarioId],
    );

    return useCallback(
        (orgUnitId: number) => {
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
