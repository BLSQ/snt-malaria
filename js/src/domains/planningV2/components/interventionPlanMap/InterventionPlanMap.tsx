import React, { FC, useCallback, useMemo } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
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

type InterventionChip = { id: number; name: string; color: string };

const OrgUnitTooltip: FC<{
    orgUnit: OrgUnit;
    chips: InterventionChip[];
    metricLabel?: string | number;
}> = ({ orgUnit, chips, metricLabel }) => (
    <Box p={1}>
        <Typography variant="subtitle2">{orgUnit.short_name}</Typography>
        {metricLabel != null && (
            <Typography variant="caption" display="block">
                {metricLabel}
            </Typography>
        )}
        {chips.length > 0 && (
            <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                {chips.map(chip => (
                    <Chip
                        label={chip.name}
                        key={chip.id}
                        size="small"
                        sx={{ backgroundColor: chip.color }}
                    />
                ))}
            </Box>
        )}
    </Box>
);

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
    previewRule?: Partial<ScenarioRule>;
};

export const InterventionsPlanMap: FC<Props> = ({
    selectedOrgUnitIds,
    previewRule,
}) => {
    const previewRuleColor = previewRule?.color;
    const previewRuleName = previewRule?.name;
    const previewInterventionIds = useMemo(
        () =>
            (previewRule?.intervention_properties ?? [])
                .map(ip => ip.intervention)
                .filter((id): id is number => id != null),
        [previewRule?.intervention_properties],
    );
    const [selectedMetricLayer, setSelectedMetricLayer] = React.useState<
        MetricType | undefined
    >(undefined);

    const {
        orgUnits,
        interventionAssignments,
        interventionCategories,
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

        const uniqueColors = [
            ...new Set(rules.map(r => r.color || mapTheme.shapeColor)),
        ];

        if (uniqueColors.length === 1) {
            return uniqueColors[0];
        }

        return blendColors(uniqueColors);
    }, []);

    const orgUnitPlans = useMemo(() => {
        const map = new Map<
            number,
            {
                interventions: Intervention[];
                rules: ScenarioRule[];
                rulesKey: string;
                interventionChips: InterventionChip[];
            }
        >();
        interventionAssignments.forEach(assignment => {
            const entry = map.get(assignment.org_unit.id) || {
                interventions: [],
                rules: [],
                rulesKey: '',
                interventionChips: [],
            };

            const newRules = [
                ...new Set<ScenarioRule>(
                    [...entry.rules, assignment.rule].filter(
                        (r): r is ScenarioRule => r != null,
                    ),
                ),
            ];
            const newInterventions = [
                ...new Set<Intervention>([
                    ...entry.interventions,
                    assignment.intervention,
                ]),
            ];

            const chipExists = entry.interventionChips.some(
                c => c.id === assignment.intervention.id,
            );
            const newChips = chipExists
                ? entry.interventionChips
                : [
                    ...entry.interventionChips,
                    {
                        id: assignment.intervention.id,
                        name: assignment.intervention.short_name,
                        color:
                            assignment.rule?.color || mapTheme.shapeColor,
                    },
                ];

            map.set(assignment.org_unit.id, {
                interventions: newInterventions,
                rules: newRules,
                rulesKey: newRules
                    .map((r: ScenarioRule) => r.id)
                    .join(','),
                interventionChips: newChips,
            });
        });

        return map;
    }, [interventionAssignments]);

    const previewInterventionChips = useMemo(() => {
        if (!previewInterventionIds?.length || !previewRuleColor) return [];
        const allInterventions = interventionCategories.flatMap(
            c => c.interventions,
        );
        return previewInterventionIds
            .map(id => allInterventions.find(i => i.id === id))
            .filter(Boolean)
            .map(i => ({
                id: i!.id,
                name: i!.short_name,
                color: previewRuleColor,
            }));
    }, [previewInterventionIds, previewRuleColor, interventionCategories]);

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

    const isPreviewingWithoutLayer = isEditing && !selectedMetricLayer;
    const isPreviewingWithLayer = isEditing && !!selectedMetricLayer;

    const selectedOrgUnitIdSet = useMemo(
        () => new Set(selectedOrgUnitIds ?? []),
        [selectedOrgUnitIds],
    );

    const getOrgUnitMapStyle = useCallback(
        (orgUnitId: number) => {
            if (isPreviewingWithoutLayer) {
                if (previewRuleColor && selectedOrgUnitIdSet.has(orgUnitId)) {
                    return {
                        label: previewRuleName ?? '',
                        color: previewRuleColor,
                    };
                }
                return { label: '', color: mapTheme.shapeColor };
            }
            if (!selectedMetricLayer || !isEditing) {
                return getOrgUnitMapMisc(orgUnitId);
            }
            const metric = getSelectedMetric(orgUnitId);
            return getMapStyleForOrgUnit(selectedMetricLayer, metric);
        },
        [
            isPreviewingWithoutLayer,
            selectedOrgUnitIdSet,
            previewRuleColor,
            previewRuleName,
            selectedMetricLayer,
            getSelectedMetric,
            getOrgUnitMapMisc,
            isEditing,
        ],
    );

    const getTooltipChips = useCallback(
        (orgUnitId: number): InterventionChip[] => {
            if (!isEditing) {
                return orgUnitPlans.get(orgUnitId)?.interventionChips ?? [];
            }
            return selectedOrgUnitIdSet.has(orgUnitId)
                ? previewInterventionChips
                : [];
        },
        [
            isEditing,
            orgUnitPlans,
            selectedOrgUnitIdSet,
            previewInterventionChips,
        ],
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

    const renderTooltip = useCallback(
        ({ orgUnit }: { orgUnit: OrgUnit }) => (
            <OrgUnitTooltip
                orgUnit={orgUnit}
                chips={getTooltipChips(orgUnit.id)}
                metricLabel={
                    isPreviewingWithLayer
                        ? getOrgUnitMapStyle(orgUnit.id)?.label
                        : undefined
                }
            />
        ),
        [getTooltipChips, getOrgUnitMapStyle, isPreviewingWithLayer],
    );

    return (
        <Box height="100%" width="100%" sx={styles.mainBox}>
            {orgUnits && (
                <SNTMap
                    id="intervention_plan_map"
                    border
                    orgUnits={orgUnits}
                    getOrgUnitMapMisc={getOrgUnitMapStyle}
                    selectedOrgUnitIds={
                        isPreviewingWithoutLayer
                            ? undefined
                            : selectedOrgUnitIds
                    }
                    selectedBorderColor={
                        isPreviewingWithLayer
                            ? previewRuleColor
                            : undefined
                    }
                    legendConfig={legendConfig}
                    hideLegend={isPreviewingWithoutLayer}
                    dataKey={previewRuleColor}
                    RenderTooltip={renderTooltip}
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
