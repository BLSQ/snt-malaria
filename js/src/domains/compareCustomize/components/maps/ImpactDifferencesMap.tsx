import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Box, SelectChangeEvent, Switch, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { Map as SNTMap } from '../../../../components/Map';
import { MESSAGES } from '../../../messages';
import { useGetAccountSettings } from '../../../planning/hooks/useGetAccountSettings';
import { useGetOrgUnits } from '../../../planning/hooks/useGetOrgUnits';
import { useComparisonDataContext } from '../../ComparisonDataContext';
import { MetricKey } from '../../types';
import { NO_INTERVENTION_COLOR } from '../../utils/colors';
import {
    buildDivergingScale,
    computeOrgUnitImpactComparisons,
    getDeltaCell,
} from '../../utils/divergingScale';
import { OrgUnitComparison } from '../../utils/impactCalculations';
import { useMetricConfig } from '../../utils/metricConfig';
import { ImpactDifferenceTooltipBody } from './ImpactDifferenceTooltipBody';
import { LabelChip } from './LabelChip';
import { PlanTag } from './PlanTag';
import { useImpactDetailsExpansion } from './useImpactDetailsExpansion';

const styles = {
    root: {
        position: 'relative',
        height: '100%',
        width: '100%',
    },
    overlay: {
        position: 'absolute',
        top: 10,
        left: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        zIndex: 1000,
    },
    toggleChip: {
        p: 1,
        borderRadius: 2,
        backgroundColor: theme => alpha(theme.palette.common.white, 0.75),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 1,
    },
    toggleLabel: {
        fontSize: '1rem',
        fontWeight: 500,
        color: 'text.primary',
        whiteSpace: 'nowrap',
        m: 0,
    },
    toggleSwitch: {
        my: -1,
        ml: -1,
        mr: 0,
    },
} satisfies SxStyles;

type Props = {
    selectedMetric: MetricKey;
};

/**
 * Diverging choropleth of per-org-unit deltas between the baseline scenario and a selected comparison.
 * Color direction follows `MetricConfig.positiveIsGreen`; for "lower is better" metrics
 * (the default) green = improvement, red = worsening.
 */
export const ImpactDifferencesMap: FC<Props> = ({ selectedMetric }) => {
    const {
        scenarios,
        baselineScenarioId,
        impactsByScenarioId,
        budgetsByScenarioId,
        selectedOrgUnitIds,
    } = useComparisonDataContext();
    const { data: accountSettings } = useGetAccountSettings();
    const interventionTypeId = accountSettings?.intervention_org_unit_type_id;
    const { data: orgUnits } = useGetOrgUnits({
        orgUnitTypeId: interventionTypeId,
        enabled: !!interventionTypeId,
    });
    const intl = useSafeIntl();
    const { formatMessage } = intl;
    const config = useMetricConfig();
    const metricConfig = config[selectedMetric];

    const comparisonScenarios = useMemo(
        () => scenarios.filter(s => s.id !== baselineScenarioId),
        [scenarios, baselineScenarioId],
    );

    const [selectedComparisonId, setSelectedComparisonId] = useState<
        number | undefined
    >(undefined);

    // When more than one comparison scenario exists, the user can choose
    // whether the color scale spans every comparison (stable when flipping)
    // or only the currently active pair (tighter range, recomputes on switch).
    // Default: shared, matching prior behavior.
    const [useSharedScale, setUseSharedScale] = useState(true);
    const handleSharedScaleChange = useCallback(
        (_: unknown, checked: boolean) => setUseSharedScale(checked),
        [],
    );

    useEffect(() => {
        const isCurrentValid =
            selectedComparisonId !== undefined &&
            comparisonScenarios.some(s => s.id === selectedComparisonId);

        if (!isCurrentValid) {
            setSelectedComparisonId(
                comparisonScenarios.length > 0
                    ? comparisonScenarios[0].id
                    : undefined,
            );
        }
    }, [comparisonScenarios, selectedComparisonId]);

    const handleComparisonChange = useCallback(
        (event: SelectChangeEvent<number>) => {
            setSelectedComparisonId(Number(event.target.value));
        },
        [],
    );

    // Compute the per-district values for every comparison scenario once. The currently
    // selected pair is read out of the same deltas for rendering. When the
    // shared-scale toggle is on, the full set feeds buildDivergingScale so
    // the color scale stays stable while the user flips between comparisons.
    const comparisonsByScenarioId = useMemo(() => {
        const result = new Map<number, Map<number, OrgUnitComparison>>();
        if (!baselineScenarioId) return result;
        const baselineImpact = impactsByScenarioId.get(baselineScenarioId);
        const baselineBudget = budgetsByScenarioId.get(baselineScenarioId);
        for (const scenario of comparisonScenarios) {
            const comparisonImpact = impactsByScenarioId.get(scenario.id);
            const comparisonBudget = budgetsByScenarioId.get(scenario.id);
            result.set(
                scenario.id,
                computeOrgUnitImpactComparisons(
                    selectedMetric,
                    baselineImpact,
                    comparisonImpact,
                    baselineBudget,
                    comparisonBudget,
                ),
            );
        }
        return result;
    }, [
        baselineScenarioId,
        comparisonScenarios,
        selectedMetric,
        impactsByScenarioId,
        budgetsByScenarioId,
    ]);

    const deltaMapsByScenarioId = useMemo(
        () =>
            new Map(
                Array.from(
                    comparisonsByScenarioId,
                    ([scenarioId, comparisons]) => [
                        scenarioId,
                        new Map(
                            Array.from(comparisons, ([orgUnitId, values]) => [
                                orgUnitId,
                                values.comparison - values.baseline,
                            ]),
                        ),
                    ],
                ),
            ),
        [comparisonsByScenarioId],
    );

    const deltaMap = useMemo(
        () =>
            selectedComparisonId !== undefined
                ? (deltaMapsByScenarioId.get(selectedComparisonId) ??
                  new Map<number, number>())
                : new Map<number, number>(),
        [deltaMapsByScenarioId, selectedComparisonId],
    );

    const scale = useMemo(() => {
        const allDeltas = useSharedScale
            ? Array.from(deltaMapsByScenarioId.values()).flatMap(m =>
                  Array.from(m.values()),
              )
            : Array.from(deltaMap.values());
        return buildDivergingScale(intl, metricConfig, allDeltas);
    }, [deltaMapsByScenarioId, deltaMap, useSharedScale, intl, metricConfig]);

    const legendConfig = useMemo(
        () =>
            scale.isVisible
                ? {
                      units: '',
                      legend_type: 'linear',
                      legend_config: {
                          domain: scale.domainLabels,
                          range: scale.range,
                      },
                      unit_symbol: '',
                  }
                : undefined,
        [scale],
    );

    const getOrgUnitMapMisc = useCallback(
        (orgUnitId: number) =>
            getDeltaCell(intl, metricConfig, deltaMap.get(orgUnitId), scale),
        [deltaMap, scale, intl, metricConfig],
    );

    const baselineScenario = scenarios.find(s => s.id === baselineScenarioId);
    const selectedComparison = comparisonScenarios.find(
        s => s.id === selectedComparisonId,
    );
    const hasData = deltaMap.size > 0;
    const getImpactDetails = useImpactDetailsExpansion({
        scenarioId: selectedComparisonId,
        highlightedMetric: selectedMetric,
    });

    const getTooltipContent = useCallback(
        (orgUnit: OrgUnit) => {
            const values =
                selectedComparisonId !== undefined
                    ? comparisonsByScenarioId
                          .get(selectedComparisonId)
                          ?.get(orgUnit.id)
                    : undefined;
            const delta = values && values.comparison - values.baseline;
            return {
                headerExtra: baselineScenario && selectedComparison && (
                    <PlanTag
                        label={formatMessage(MESSAGES.tooltipVsBaseline)}
                        colors={[
                            baselineScenario.color,
                            selectedComparison.color,
                        ]}
                    />
                ),
                body: (
                    <ImpactDifferenceTooltipBody
                        metricLabel={metricConfig.label}
                        change={
                            delta === undefined
                                ? undefined
                                : intl.formatNumber(delta, {
                                      ...metricConfig.format,
                                      notation: 'standard',
                                      signDisplay: 'exceptZero',
                                  })
                        }
                        values={values}
                        positiveIsGreen={metricConfig.positiveIsGreen}
                    />
                ),
            };
        },
        [
            selectedComparisonId,
            comparisonsByScenarioId,
            baselineScenario,
            selectedComparison,
            formatMessage,
            metricConfig,
            intl,
        ],
    );
    const getTooltipActions = useCallback(
        (orgUnit: OrgUnit) => getImpactDetails(orgUnit.id),
        [getImpactDetails],
    );
    const dataKey = useMemo(
        () =>
            [
                selectedComparisonId ?? 'none',
                selectedMetric,
                deltaMap.size,
                useSharedScale ? 'shared' : 'local',
                scale.domain.join(','),
            ].join('_'),
        [
            selectedComparisonId,
            selectedMetric,
            deltaMap.size,
            useSharedScale,
            scale.domain,
        ],
    );

    const chipOverlay = (
        <Box sx={styles.overlay}>
            {baselineScenario && (
                <LabelChip
                    color={baselineScenario.color}
                    label={baselineScenario.label}
                />
            )}
            {selectedComparisonId !== undefined && selectedComparison && (
                <LabelChip
                    color={selectedComparison.color}
                    label={selectedComparison.label}
                    options={comparisonScenarios}
                    value={selectedComparisonId}
                    onChange={handleComparisonChange}
                />
            )}
            {comparisonScenarios.length > 1 && (
                <Tooltip
                    title={formatMessage(
                        MESSAGES.impactDifferencesSharedScaleTooltip,
                    )}
                    placement="bottom"
                >
                    <Box sx={styles.toggleChip}>
                        <Box sx={styles.toggleLabel}>
                            {formatMessage(
                                MESSAGES.impactDifferencesSharedScale,
                            )}
                        </Box>
                        <Switch
                            size="small"
                            checked={useSharedScale}
                            onChange={handleSharedScaleChange}
                            sx={styles.toggleSwitch}
                        />
                    </Box>
                </Tooltip>
            )}
        </Box>
    );

    return (
        <Box sx={styles.root}>
            <SNTMap
                border
                id="impact_differences_map"
                orgUnits={orgUnits ?? []}
                visibleOrgUnitIds={selectedOrgUnitIds}
                getOrgUnitMapMisc={getOrgUnitMapMisc}
                legendConfig={legendConfig}
                hideLegend={!hasData}
                defaultColor={NO_INTERVENTION_COLOR}
                getTooltipContent={getTooltipContent}
                getTooltipActions={getTooltipActions}
                dataKey={dataKey}
            />
            {chipOverlay}
        </Box>
    );
};
