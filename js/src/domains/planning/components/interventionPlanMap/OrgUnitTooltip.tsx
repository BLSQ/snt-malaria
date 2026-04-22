import React, { FC } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { InterventionChip } from './buildEffectiveAssignments';

export type OrgUnitTooltipProps = {
    orgUnit: OrgUnit;
    chips: InterventionChip[];
    /** Shown when a metric layer is active (e.g. value label from map style). */
    metricLabel?: string | number;
};

/**
 * Hover content for the intervention plan map: org unit name, optional metric label
 * when a layer is selected, and color-coded chips for interventions assigned to
 * that org unit.
 */
export const OrgUnitTooltip: FC<OrgUnitTooltipProps> = ({
    orgUnit,
    chips,
    metricLabel,
}) => (
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
