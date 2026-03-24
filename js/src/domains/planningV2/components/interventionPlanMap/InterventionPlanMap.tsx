import React, { FC, useCallback, useMemo } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { LayerSelect } from '../../../../components/LayerSelect';
import { Map as SNTMap } from '../../../../components/Map';
import { LegendTypes } from '../../../../constants/legend';
import { mapTheme } from '../../../../constants/map-theme';
import { MESSAGES } from '../../../messages';
import { useGetMetricValues } from '../../../planning/hooks/useGetMetrics';
import { blendColors } from '../../../planning/libs/color-utils';
import {
    getMapStyleForOrgUnit,
    useGetOrgUnitMetric,
} from '../../../planning/libs/map-utils';
import { Intervention } from '../../../planning/types/interventions';
import { MetricType } from '../../../planning/types/metrics';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { ScenarioRule } from '../../types/scenarioRule';

const defaultLegendConfig = {
    units: '',
    legend_type: LegendTypes.ORDINAL,
    legend_config: {
        domain: [],
        range: [],
    },
    unit_symbol: '',
};

const styles: SxStyles = {
    mainBox: {
        overflow: 'hidden',
        position: 'relative',
    },
    customizeButton: {
        marginRight: 1,
        '&.MuiButton-outlined': {
            borderColor: 'white',
            backgroundColor: 'white',
        },
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
    selectedOrgUnitIds?: number[];
};

export const InterventionsPlanMap: FC<Props> = ({ selectedOrgUnitIds }) => {
    const [selectedMetricLayer, setSelectedMetricLayer] = React.useState<
        MetricType | undefined
    >(undefined);

    const {
        orgUnits,
        interventionAssignments,
        metricTypeCategories,
        isEditing,
    } = usePlanningContext();

    const { data: metricValues } = useGetMetricValues({
        metricTypeId: selectedMetricLayer?.id || null,
    });

    const getSelectedMetric = useGetOrgUnitMetric(metricValues);

    const getColorForRules = useCallback((rules: ScenarioRule[]) => {
        if (rules.length === 0) {
            return mapTheme.shapeColor;
        }

        if (rules.length === 1) {
            return rules[0].color || mapTheme.shapeColor;
        }

        return blendColors(rules.map(r => r.color || mapTheme.shapeColor));
    }, []);

    const orgUnitPlans = useMemo(() => {
        const map = new Map<number, any>();
        interventionAssignments.forEach(assignment => {
            const { interventions, rules } = map.get(
                assignment.org_unit.id,
            ) || {
                interventions: [],
                rules: [],
                rulesKey: '',
            };

            const newRules = [
                ...new Set<ScenarioRule>(
                    [...rules, assignment.rule].filter(Boolean),
                ),
            ];
            const newInterventions = [
                ...new Set<any>([...interventions, assignment.intervention]),
            ];

            const newRulesKey = newRules
                .map((r: ScenarioRule) => r.id)
                .join(',');

            map.set(assignment.org_unit.id, {
                interventions: newInterventions,
                rules: newRules,
                rulesKey: newRulesKey,
            });
        });

        return map;
    }, [interventionAssignments]);

    const rulesColors = useMemo(() => {
        const colorMap = new Map<string, { label: string; color: string }>();
        orgUnitPlans.forEach(({ rules, interventions, rulesKey }) => {
            colorMap.set(rulesKey, {
                label: interventions
                    .map((r: Intervention) => r.short_name)
                    .join(', '),
                color: getColorForRules(rules),
            });
        });
        return colorMap;
    }, [orgUnitPlans, getColorForRules]);

    const getOrgUnitMapMisc = useCallback(
        (orgUnitId: number) => {
            const plans = orgUnitPlans.get(orgUnitId);
            const rulesColor = plans
                ? rulesColors.get(plans.rulesKey)
                : undefined;
            return (
                rulesColor || {
                    label: '',
                    color: mapTheme.shapeColor,
                }
            );
        },
        [orgUnitPlans, rulesColors],
    );

    const getOrgUnitMapStyle = useCallback(
        (orgUnitId: number) => {
            if (!selectedMetricLayer || !isEditing) {
                return getOrgUnitMapMisc(orgUnitId);
            }
            const metric = getSelectedMetric(orgUnitId);
            return getMapStyleForOrgUnit(selectedMetricLayer, metric);
        },
        [selectedMetricLayer, getSelectedMetric, getOrgUnitMapMisc, isEditing],
    );

    const legendConfig = useMemo(() => {
        if (isEditing && selectedMetricLayer) {
            return selectedMetricLayer;
        }

        const legend_config = { domain: [] as string[], range: [] as string[] };
        rulesColors.forEach(({ label, color }) => {
            legend_config.domain.push(label);
            legend_config.range.push(color);
        });
        return {
            ...defaultLegendConfig,
            legend_config: legend_config,
        };
    }, [rulesColors, isEditing, selectedMetricLayer]);

    return (
        <Box height="100%" width="100%" sx={styles.mainBox}>
            {orgUnits && (
                <SNTMap
                    id="intervention_plan_map"
                    border
                    orgUnits={orgUnits}
                    getOrgUnitMapMisc={getOrgUnitMapStyle}
                    selectedOrgUnitIds={selectedOrgUnitIds}
                    legendConfig={legendConfig}
                    RenderTooltip={({ orgUnit }) => (
                        <Stack direction="column" p={1}>
                            <Typography variant="subtitle2">
                                {orgUnit.short_name}
                            </Typography>
                            <Typography variant="caption">
                                {getOrgUnitMapStyle(orgUnit.id)?.label}
                            </Typography>
                            <Stack direction="row" spacing={0.5} mt={1}>
                                {orgUnitPlans
                                    .get(orgUnit.id)
                                    ?.rules?.map((rule: ScenarioRule) => (
                                        <Chip
                                            label={rule.name}
                                            key={rule.id}
                                            size="small"
                                            style={{
                                                backgroundColor: rule.color,
                                                color: 'white',
                                            }}
                                        />
                                    ))}
                            </Stack>
                        </Stack>
                    )}
                />
            )}
            {metricTypeCategories && isEditing && (
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
