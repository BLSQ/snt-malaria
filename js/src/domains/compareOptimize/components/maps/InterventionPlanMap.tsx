import React, { FC, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { Map as SNTMap } from '../../../../components/Map';
import { useGetInterventionAssignments } from '../../../planning/hooks/useGetInterventionAssignments';
import { useGetOrgUnits } from '../../../planning/hooks/useGetOrgUnits';
import { Intervention } from '../../../planning/types/interventions';
import { NO_INTERVENTION_COLOR } from '../../utils/colors';
import {
    buildOrgUnitLookup,
    buildInterventionGroups,
    getOrgUnitsForIntervention,
} from '../../utils/interventionGroups';
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

const defaultLegendConfig = {
    units: '',
    legend_type: 'ordinal',
    legend_config: {
        domain: [] as string[],
        range: [] as string[],
    },
    unit_symbol: '',
};

type Props = {
    scenarioId: number | undefined;
    selectedInterventionId: number;
    selectedColor: string;
    mapId: string;
    titleDotColor: string;
    titleText: string;
};

/**
 * Renders a choropleth map showing which interventions are assigned to each
 * org unit for a given scenario. Org units sharing the same intervention
 * combination get the same color shade.
 */
export const InterventionPlanMap: FC<Props> = ({
    scenarioId,
    selectedInterventionId,
    selectedColor,
    mapId,
    titleDotColor,
    titleText,
}) => {
    const { data: orgUnits } = useGetOrgUnits();
    const {
        data: interventionAssignments,
        isLoading: isLoadingInterventionAssignments,
    } = useGetInterventionAssignments(scenarioId);

    const orgUnitInterventions = useMemo(() => {
        if (isLoadingInterventionAssignments)
            return new Map<number, Intervention[]>();
        return buildOrgUnitLookup(interventionAssignments ?? []);
    }, [interventionAssignments, isLoadingInterventionAssignments]);

    const highlightedOrgUnits = useMemo(
        () =>
            getOrgUnitsForIntervention(
                selectedInterventionId,
                orgUnitInterventions,
            ),
        [selectedInterventionId, orgUnitInterventions],
    );

    const interventionGroups = useMemo(
        () => buildInterventionGroups(orgUnitInterventions, selectedColor),
        [orgUnitInterventions, selectedColor],
    );

    const getOrgUnitMapMisc = useCallback(
        (orgUnitId: number) => {
            if (!highlightedOrgUnits.has(orgUnitId)) {
                return { color: NO_INTERVENTION_COLOR, label: '' };
            }

            if (selectedInterventionId > 0) {
                return { color: selectedColor, label: '' };
            }

            const { color, label } =
                interventionGroups.find(g =>
                    g.orgUnitIds.includes(orgUnitId),
                ) ?? {};
            return { color, label };
        },
        [
            highlightedOrgUnits,
            selectedInterventionId,
            selectedColor,
            interventionGroups,
        ],
    );

    const legendConfig = useMemo(() => {
        const domain: string[] = [];
        const range: string[] = [];
        interventionGroups.forEach(g => {
            range.push(g.color);
            domain.push(g.label);
        });
        return { ...defaultLegendConfig, legend_config: { domain, range } };
    }, [interventionGroups]);

    return (
        <Box sx={styles.root}>
            <SNTMap
                border
                id={mapId}
                orgUnits={orgUnits ?? []}
                getOrgUnitMapMisc={getOrgUnitMapMisc}
                legendConfig={legendConfig}
                hideLegend={
                    selectedInterventionId > 0 ||
                    !interventionAssignments ||
                    interventionAssignments.length <= 0
                }
            />
            <Box sx={styles.overlay}>
                <LabelChip color={titleDotColor} label={titleText} />
            </Box>
        </Box>
    );
};
