import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Box, SelectChangeEvent } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { Map as SNTMap } from '../../../../components/Map';
import { useGetOrgUnits } from '../../../planning/hooks/useGetOrgUnits';
import { formatBigNumber } from '../../../planning/libs/cost-utils';
import { NO_INTERVENTION_COLOR } from '../../utils/colors';
import {
    buildDivergingScale,
    computeOrgUnitDeltas,
    getColorForValue,
} from '../../utils/divergingScale';
import { ScenarioImpactMetrics, ScenarioDisplay } from '../../types';
import { LabelChip } from './LabelChip';

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
} satisfies SxStyles;

type Props = {
    scenarios: ScenarioDisplay[];
    baselineScenarioId: number | undefined;
    impactsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>;
};

/**
 * Displays a diverging color-shaded map of per-org-unit direct-death deltas
 * between the baseline scenario and a selected comparison scenario.
 * Green shades indicate fewer deaths (improvement), red shades more deaths.
 */
export const ImpactDifferencesMap: FC<Props> = ({
    scenarios,
    baselineScenarioId,
    impactsByScenarioId,
}) => {
    const { data: orgUnits } = useGetOrgUnits();

    const comparisonScenarios = useMemo(
        () => scenarios.filter(s => s.id !== baselineScenarioId),
        [scenarios, baselineScenarioId],
    );

    const [selectedComparisonId, setSelectedComparisonId] = useState<
        number | undefined
    >(undefined);

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

    const deltaMap = useMemo(() => {
        if (
            baselineScenarioId === undefined ||
            selectedComparisonId === undefined
        )
            return new Map<number, number>();

        const baselineImpact = impactsByScenarioId.get(baselineScenarioId);
        const comparisonImpact =
            impactsByScenarioId.get(selectedComparisonId);
        if (!baselineImpact || !comparisonImpact)
            return new Map<number, number>();

        return computeOrgUnitDeltas(baselineImpact, comparisonImpact);
    }, [baselineScenarioId, selectedComparisonId, impactsByScenarioId]);

    const scale = useMemo(() => {
        if (deltaMap.size === 0) return buildDivergingScale(0, 0);
        const values = Array.from(deltaMap.values());
        return buildDivergingScale(Math.min(...values), Math.max(...values));
    }, [deltaMap]);

    const legendConfig = useMemo(() => {
        if (scale.labels.length === 0) return undefined;
        return {
            units: '',
            legend_type: 'ordinal',
            legend_config: { domain: scale.labels, range: scale.colors },
            unit_symbol: '',
        };
    }, [scale]);

    /**
     * Returns the fill color and tooltip label for a single org unit.
     * Org units with no delta (or zero delta) are shown in neutral grey.
     */
    const getOrgUnitMapMisc = useCallback(
        (orgUnitId: number) => {
            const delta = deltaMap.get(orgUnitId);
            if (delta === undefined || delta === 0) {
                return {
                    color: NO_INTERVENTION_COLOR,
                    label: delta === 0 ? '+0' : undefined,
                };
            }
            const color = getColorForValue(
                delta,
                scale.thresholds,
                scale.colors,
            );
            const sign = delta >= 0 ? '+' : '';
            return {
                color,
                label: `${sign}${formatBigNumber(Math.round(delta))}`,
            };
        },
        [deltaMap, scale],
    );

    const baselineScenario = scenarios.find(s => s.id === baselineScenarioId);
    const selectedComparison = comparisonScenarios.find(
        s => s.id === selectedComparisonId,
    );
    const hasData = deltaMap.size > 0;
    const dataKey = `${selectedComparisonId ?? 'none'}_${deltaMap.size}`;

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
        </Box>
    );

    return (
        <Box sx={styles.root}>
            <SNTMap
                border
                id="impact_differences_map"
                orgUnits={orgUnits ?? []}
                getOrgUnitMapMisc={getOrgUnitMapMisc}
                legendConfig={legendConfig}
                hideLegend={!hasData}
                defaultColor={NO_INTERVENTION_COLOR}
                dataKey={dataKey}
            />
            {chipOverlay}
        </Box>
    );
};
