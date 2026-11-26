import React, { useCallback, useMemo, useState } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { GetMapHoverCardActions } from '../../../../components/hoverCard/MapHoverCard';
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
import {
    EQUAL_OPERATOR,
    Operator,
} from '../scenarioRule/scenarioRuleForm/CriterionOperatorSelect';
import { CriterionOperatorActions } from './CriterionOperatorActions';
import {
    buildValuePreviewRules,
    useCriterionPreview,
} from './useCriterionPreview';

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

type AppliedCriterion = {
    ids?: number[];
    layer: MetricType;
    matchedIdsByMetric?: Record<string, number[]>;
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
    const [applied, setApplied] = useState<AppliedCriterion>();
    const appliedCriterionIds =
        applied?.layer === activeMetricLayer &&
        applied?.matchedIdsByMetric === matchedIdsByMetric
            ? applied?.ids
            : undefined;

    const isOrdinalLayer =
        activeMetricLayer?.legend_type === LegendTypes.ORDINAL;
    const ordinalValueRules = useMemo(
        () =>
            activeMetricLayer && isOrdinalLayer
                ? buildValuePreviewRules(
                      activeMetricLayer.id,
                      activeMetricLayer.legend_config.domain.map(String),
                  )
                : {},
        [activeMetricLayer, isOrdinalLayer],
    );
    const matchesByOrdinalValue = useCriterionPreview(
        ordinalValueRules,
        dataLayerYears,
        Boolean(ruleFormActions) && isOrdinalLayer,
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

    const applyCriterion = useCallback(
        (
            criterion: Pick<
                MetricTypeCriterion,
                'operator' | 'value' | 'string_value'
            >,
            matches?: number[],
        ) => {
            if (!ruleFormActions || !activeMetricLayer) return;
            setHoveredOperatorIds(undefined);
            setApplied({
                ids: matches,
                layer: activeMetricLayer,
                matchedIdsByMetric,
            });
            ruleFormActions.setCriterion({
                ...defaultMatchingCriteria,
                metric_type: activeMetricLayer.id,
                ...criterion,
            });
        },
        [ruleFormActions, activeMetricLayer, matchedIdsByMetric],
    );

    const applyThreshold = useCallback(
        (operator: Operator, value: number, matches?: number[]) =>
            applyCriterion({ operator, value, string_value: '' }, matches),
        [applyCriterion],
    );

    const getTooltipActions = useCallback<GetMapHoverCardActions>(
        ({ id: orgUnitId }: OrgUnit) => {
            if (!ruleFormActions) return {};
            if (!activeMetricLayer) {
                const { toggleOrgUnit } = ruleFormActions;
                if (!toggleOrgUnit) return {};
                return {
                    hint: formatMessage(
                        matchedIds.has(orgUnitId)
                            ? MESSAGES.tooltipClickToRemoveFromRule
                            : MESSAGES.tooltipClickToAddToRule,
                    ),
                    onClick: () => toggleOrgUnit(orgUnitId),
                };
            }
            const metric = getOrgUnitMetric(orgUnitId);
            if (!metric || activeMetricLayer.is_complete === false) {
                return {};
            }

            if (isOrdinalLayer) {
                return {
                    hint: currentCriterion
                        ? formatMessage(MESSAGES.tooltipClickToSetValue, {
                              value: String(metric.label),
                          })
                        : formatMessage(MESSAGES.tooltipClickToAddCriterion),
                    onClick: () =>
                        applyCriterion(
                            {
                                operator: EQUAL_OPERATOR,
                                string_value: metric.value,
                            },
                            matchesByOrdinalValue?.[metric.value],
                        ),
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
                            onApply={applyThreshold}
                            onClose={close}
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
            isOrdinalLayer,
            matchesByOrdinalValue,
            dataLayerYears,
            formatMessage,
            formatMetricValue,
            applyCriterion,
            applyThreshold,
        ],
    );

    return {
        getTooltipActions: ruleFormActions ? getTooltipActions : undefined,
        criterionPreviewIds: hoveredOperatorIds ?? appliedCriterionIds,
    };
};
