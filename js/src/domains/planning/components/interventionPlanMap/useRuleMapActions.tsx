import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { MapHoverCardActions } from '../../../../components/hoverCard/MapHoverCard';
import { LegendTypes } from '../../../../constants/legend';
import { useFormatMetricValue } from '../../../../hooks/useFormatMetricValue';
import { MetricType } from '../../../dataLayers/types/metrics';
import { MESSAGES } from '../../../messages';
import { defaultMatchingCriteria } from '../../hooks/useScenarioRuleFormState';
import {
    MetricTypeCriterion,
    RuleFormActions,
    ScenarioRule,
} from '../../types/scenarioRule';
import { EQUAL_OPERATOR } from '../scenarioRule/scenarioRuleForm/CriterionOperatorSelect';
import { CriterionOperatorActions } from './CriterionOperatorActions';

type Args = {
    ruleFormActions?: RuleFormActions;
    activeMetricLayer?: MetricType;
    getOrgUnitMetric: (
        orgUnitId: number,
    ) => { label: string | number; value: string } | undefined;
    previewRule?: Partial<ScenarioRule>;
    matchedOrgUnitIds?: number[];
    matchedIdsByMetric?: Record<string, number[]>;
    dataLayerYears?: Record<string, number>;
};

export const useRuleMapActions = ({
    ruleFormActions,
    activeMetricLayer,
    getOrgUnitMetric,
    previewRule,
    matchedOrgUnitIds,
    matchedIdsByMetric,
    dataLayerYears,
}: Args) => {
    const { formatMessage } = useSafeIntl();
    const formatMetricValue = useFormatMetricValue();
    const [hoveredOperatorIds, setHoveredOperatorIds] = useState<number[]>();
    const [appliedOperatorIds, setAppliedOperatorIds] = useState<number[]>();

    useEffect(
        () => setAppliedOperatorIds(undefined),
        [matchedIdsByMetric, activeMetricLayer],
    );

    const matchedIds = useMemo(
        () => new Set(matchedOrgUnitIds),
        [matchedOrgUnitIds],
    );
    const currentCriterion = useMemo(
        () =>
            activeMetricLayer &&
            previewRule?.matching_criteria?.find(
                criterion => criterion.metric_type === activeMetricLayer.id,
            ),
        [activeMetricLayer, previewRule?.matching_criteria],
    );

    const getRuleActions = useCallback(
        (orgUnitId: number): MapHoverCardActions => {
            if (!ruleFormActions) return {};
            if (!activeMetricLayer) {
                return {
                    hint: formatMessage(
                        matchedIds.has(orgUnitId)
                            ? MESSAGES.tooltipClickToRemoveFromRule
                            : MESSAGES.tooltipClickToAddToRule,
                    ),
                    onClick: () => ruleFormActions.toggleOrgUnit(orgUnitId),
                };
            }
            const metric = getOrgUnitMetric(orgUnitId);
            if (!metric || activeMetricLayer.is_complete === false) {
                return {};
            }
            const setCriterion = (
                criterion: Pick<
                    MetricTypeCriterion,
                    'operator' | 'value' | 'string_value'
                >,
            ) =>
                ruleFormActions.setCriterion({
                    ...defaultMatchingCriteria,
                    metric_type: activeMetricLayer.id,
                    ...criterion,
                });

            if (activeMetricLayer.legend_type === LegendTypes.ORDINAL) {
                return {
                    hint: currentCriterion
                        ? formatMessage(MESSAGES.tooltipClickToSetValue, {
                              value: String(metric.label),
                          })
                        : formatMessage(MESSAGES.tooltipClickToAddCriterion),
                    onClick: () =>
                        setCriterion({
                            operator: EQUAL_OPERATOR,
                            string_value: metric.value,
                        }),
                };
            }

            if (typeof metric.label !== 'number') return {};
            const value = metric.label;
            return {
                hint: formatMessage(
                    currentCriterion
                        ? MESSAGES.tooltipClickToSetThreshold
                        : MESSAGES.tooltipClickToAddCriterion,
                ),
                expansion: {
                    title: formatMessage(
                        currentCriterion
                            ? MESSAGES.tooltipUpdateCriterionTo
                            : MESSAGES.tooltipAddCriterionAt,
                        {
                            value: formatMetricValue(
                                value,
                                activeMetricLayer.unit_symbol,
                            ),
                        },
                    ),
                    content: ({ side, isExpanded, close }) => (
                        <CriterionOperatorActions
                            metricTypeId={activeMetricLayer.id}
                            value={value}
                            currentCriterion={currentCriterion}
                            dataLayerYears={dataLayerYears}
                            isActive={isExpanded}
                            side={side}
                            onPreview={setHoveredOperatorIds}
                            onApply={(operator, matches) => {
                                setHoveredOperatorIds(undefined);
                                setAppliedOperatorIds(matches);
                                setCriterion({
                                    operator,
                                    value,
                                    string_value: '',
                                });
                                close();
                            }}
                        />
                    ),
                },
            };
        },
        [
            ruleFormActions,
            activeMetricLayer,
            getOrgUnitMetric,
            matchedIds,
            currentCriterion,
            dataLayerYears,
            formatMessage,
            formatMetricValue,
        ],
    );

    return {
        getRuleActions,
        operatorPreviewIds: hoveredOperatorIds ?? appliedOperatorIds,
    };
};
