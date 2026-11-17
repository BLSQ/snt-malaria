import React, { FC } from 'react';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { hoverCardSpacing } from '../../../../components/hoverCard/hoverCardSpacing';
import {
    TooltipChip,
    TooltipChipList,
} from '../../../../components/hoverCard/TooltipChip';
import { MESSAGES } from '../../../messages';
import { InterventionChip } from './buildEffectiveAssignments';

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: hoverCardSpacing.labelToContent,
    },
} satisfies SxStyles;

type Props = {
    interventions: InterventionChip[];
};

export const InterventionsTooltipBody: FC<Props> = ({ interventions }) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Box sx={styles.root}>
            <Typography variant="caption" color="text.secondary">
                {formatMessage(MESSAGES.tooltipInterventionCount, {
                    count: String(interventions.length),
                })}
            </Typography>
            {interventions.length > 0 && (
                <TooltipChipList>
                    {interventions.map(intervention => (
                        <TooltipChip
                            key={intervention.id}
                            label={intervention.name}
                            color={intervention.color}
                        />
                    ))}
                </TooltipChipList>
            )}
        </Box>
    );
};
