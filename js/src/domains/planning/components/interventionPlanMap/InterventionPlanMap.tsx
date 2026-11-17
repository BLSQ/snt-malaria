import React, { FC, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { hoverCardSpacing } from '../../../../components/hoverCard/hoverCardSpacing';
import { HoverCardValue } from '../../../../components/hoverCard/HoverCardValue';
import { LayerSelect } from '../../../../components/LayerSelect';
import { Map as SNTMap } from '../../../../components/Map';
import { useGetMetricValues } from '../../../dataLayers/hooks/useGetMetrics';
import { MetricType } from '../../../dataLayers/types/metrics';
import { MESSAGES } from '../../../messages';
import { getDataLayerYear } from '../../../scenarios/types';
import { usePlanningContext } from '../../contexts/PlanningContext';
import {
    getMapStyleForOrgUnit,
    useGetOrgUnitMetric,
} from '../../libs/map-utils';
import { ScenarioRule } from '../../types/scenarioRule';
import { buildAssignmentDisplay } from './buildAssignmentDisplay';
import {
    buildPreviewAssignments,
    buildSavedAssignments,
} from './buildEffectiveAssignments';
import { CriterionMatchLine } from './CriterionMatchLine';
import { getInterventionMapPresentation } from './getInterventionMapPresentation';
import { InterventionsTooltipBody } from './InterventionsTooltipBody';
import { RuleSelectionTooltipBody } from './RuleSelectionTooltipBody';
import { useRuleTooltipData } from './useRuleTooltipData';

const styles: SxStyles = {
    mainBox: {
        overflow: 'hidden',
        position: 'relative',
    },
    metricLayerTooltipBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: hoverCardSpacing.section,
    },
    actionBox: {
        position: 'absolute',
        top: 0,
        left: 0,
        padding: 1,
        zIndex: 500,
    },
};

type Props = {
    matchedOrgUnitIds?: number[];
    matchedIdsByMetric?: Record<string, number[]>;
    previewRule?: Partial<ScenarioRule>;
};

export const InterventionPlanMap: FC<Props> = ({
    matchedOrgUnitIds,
    matchedIdsByMetric,
    previewRule,
}) => {
    const {
        orgUnits,
        interventionAssignments,
        interventionCategories,
        metricTypeCategories,
        isEditing: isPreviewingRule,
        scenario,
        mapMetricTypeId,
        setMapMetricTypeId,
    } = usePlanningContext();

    const metricTypes = useMemo(
        () => metricTypeCategories?.flatMap(category => category.items) ?? [],
        [metricTypeCategories],
    );
    const selectedMetricLayer = useMemo(
        () => metricTypes.find(metricType => metricType.id === mapMetricTypeId),
        [metricTypes, mapMetricTypeId],
    );
    const handleLayerChange = useCallback(
        (metricType?: MetricType) => setMapMetricTypeId(metricType?.id),
        [setMapMetricTypeId],
    );

    const activeMetricLayer = isPreviewingRule
        ? selectedMetricLayer
        : undefined;

    const effectiveAssignments = useMemo(() => {
        if (isPreviewingRule) {
            return buildPreviewAssignments({
                matchedOrgUnitIds,
                previewRule,
                interventionCategories,
            });
        }
        return buildSavedAssignments(interventionAssignments);
    }, [
        isPreviewingRule,
        interventionAssignments,
        previewRule,
        matchedOrgUnitIds,
        interventionCategories,
    ]);

    const assignmentDisplay = useMemo(
        () => buildAssignmentDisplay(effectiveAssignments),
        [effectiveAssignments],
    );

    const { data: metricValues } = useGetMetricValues({
        metricTypeId: activeMetricLayer?.id || null,
        year: getDataLayerYear(
            scenario?.data_layer_years,
            activeMetricLayer?.id,
        ),
    });
    const getSelectedMetric = useGetOrgUnitMetric(metricValues);

    const getOrgUnitStyle = useCallback(
        (orgUnitId: number) => {
            if (activeMetricLayer) {
                const metric = getSelectedMetric(orgUnitId);
                return getMapStyleForOrgUnit(activeMetricLayer, metric);
            }
            return assignmentDisplay.getStyle(orgUnitId);
        },
        [activeMetricLayer, getSelectedMetric, assignmentDisplay],
    );

    const mapPresentation = useMemo(
        () =>
            getInterventionMapPresentation({
                isPreviewingRule,
                activeMetricLayer,
                previewRule,
                matchedIdsByMetric,
                assignmentLegend: assignmentDisplay.legend,
            }),
        [
            isPreviewingRule,
            activeMetricLayer,
            previewRule,
            matchedIdsByMetric,
            assignmentDisplay.legend,
        ],
    );

    const { getRuleSelection, getCriterionMatch } = useRuleTooltipData({
        previewRule,
        matchedOrgUnitIds,
        matchedIdsByMetric,
        metricTypes,
        dataLayerYears: scenario?.data_layer_years,
    });

    const getTooltipContent = useCallback(
        (orgUnit: OrgUnit) => {
            if (!isPreviewingRule) {
                return {
                    body: (
                        <InterventionsTooltipBody
                            interventions={assignmentDisplay.getChips(
                                orgUnit.id,
                            )}
                        />
                    ),
                };
            }
            if (!activeMetricLayer) {
                return {
                    body: (
                        <RuleSelectionTooltipBody
                            {...getRuleSelection(orgUnit.id)}
                        />
                    ),
                };
            }
            const { color, label } = getOrgUnitStyle(orgUnit.id);
            const criterionMatch = getCriterionMatch(
                activeMetricLayer,
                orgUnit.id,
            );
            return {
                body: (
                    <Box sx={styles.metricLayerTooltipBody}>
                        <HoverCardValue
                            caption={activeMetricLayer.name}
                            value={
                                getSelectedMetric(orgUnit.id)
                                    ? label
                                    : undefined
                            }
                            unitSymbol={activeMetricLayer.unit_symbol}
                            color={color}
                        />
                        {criterionMatch && (
                            <CriterionMatchLine {...criterionMatch} />
                        )}
                    </Box>
                ),
            };
        },
        [
            isPreviewingRule,
            assignmentDisplay,
            activeMetricLayer,
            getSelectedMetric,
            getOrgUnitStyle,
            getRuleSelection,
            getCriterionMatch,
        ],
    );

    return (
        <Box height="100%" width="100%" sx={styles.mainBox}>
            {orgUnits && (
                <SNTMap
                    id="intervention_plan_map"
                    border
                    orgUnits={orgUnits}
                    getOrgUnitMapMisc={getOrgUnitStyle}
                    selectedOrgUnitIds={mapPresentation.highlightedOrgUnitIds}
                    legendConfig={mapPresentation.legendConfig}
                    hideLegend={mapPresentation.hideLegend}
                    dataKey={mapPresentation.mapDataKey}
                    getTooltipContent={getTooltipContent}
                />
            )}
            {metricTypeCategories && isPreviewingRule && (
                <Box sx={styles.actionBox}>
                    <LayerSelect
                        placeholder={MESSAGES.noLayer}
                        clearLabel={MESSAGES.clearMapLayer}
                        selection={selectedMetricLayer}
                        metricCategories={metricTypeCategories}
                        onLayerChange={handleLayerChange}
                    />
                </Box>
            )}
        </Box>
    );
};
