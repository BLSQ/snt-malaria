import React, { FC, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { LayerSelect } from '../../../../components/LayerSelect';
import { Map as SNTMap } from '../../../../components/Map';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { useGetMetricValues } from '../../hooks/useGetMetrics';
import {
    getMapStyleForOrgUnit,
    useGetOrgUnitMetric,
} from '../../libs/map-utils';
import { MetricType } from '../../types/metrics';
import { ScenarioRule } from '../../types/scenarioRule';
import { buildAssignmentDisplay } from './buildAssignmentDisplay';
import {
    buildPreviewAssignments,
    buildSavedAssignments,
} from './buildEffectiveAssignments';
import { getInterventionMapPresentation } from './getInterventionMapPresentation';
import { OrgUnitTooltip } from './OrgUnitTooltip';

const styles: SxStyles = {
    mainBox: {
        overflow: 'hidden',
        position: 'relative',
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
    previewRule?: Partial<ScenarioRule>;
};

export const InterventionPlanMap: FC<Props> = ({
    matchedOrgUnitIds,
    previewRule,
}) => {
    const {
        orgUnits,
        interventionAssignments,
        interventionCategories,
        metricTypeCategories,
        isEditing: isPreviewingRule,
    } = usePlanningContext();

    const [selectedMetricLayer, setSelectedMetricLayer] = React.useState<
        MetricType | undefined
    >(undefined);

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
        previewRule?.intervention_properties,
        previewRule?.color,
        matchedOrgUnitIds,
        interventionCategories,
    ]);

    const assignmentDisplay = useMemo(
        () => buildAssignmentDisplay(effectiveAssignments),
        [effectiveAssignments],
    );

    const { data: metricValues } = useGetMetricValues({
        metricTypeId: activeMetricLayer?.id || null,
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
                matchedOrgUnitIds,
                assignmentLegend: assignmentDisplay.legend,
            }),
        [
            isPreviewingRule,
            activeMetricLayer,
            previewRule,
            matchedOrgUnitIds,
            assignmentDisplay.legend,
        ],
    );

    const renderTooltip = useCallback(
        ({ orgUnit }: { orgUnit: OrgUnit }) => (
            <OrgUnitTooltip
                orgUnit={orgUnit}
                chips={assignmentDisplay.getChips(orgUnit.id)}
                metricLabel={
                    activeMetricLayer
                        ? getOrgUnitStyle(orgUnit.id)?.label
                        : undefined
                }
            />
        ),
        [assignmentDisplay, activeMetricLayer, getOrgUnitStyle],
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
                    selectedBorderColor={mapPresentation.selectedBorderColor}
                    legendConfig={mapPresentation.legendConfig}
                    hideLegend={mapPresentation.hideLegend}
                    dataKey={mapPresentation.mapDataKey}
                    RenderTooltip={renderTooltip}
                />
            )}
            {metricTypeCategories && isPreviewingRule && (
                <Box sx={styles.actionBox}>
                    <LayerSelect
                        placeholder={MESSAGES.noLayer}
                        initialSelection={selectedMetricLayer}
                        metricCategories={metricTypeCategories}
                        onLayerChange={setSelectedMetricLayer}
                    />
                </Box>
            )}
        </Box>
    );
};
