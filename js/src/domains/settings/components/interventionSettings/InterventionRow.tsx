import React from 'react';
import EditIcon from '@mui/icons-material/Edit';
import { Box, Typography } from '@mui/material';
import { IconButton } from 'bluesquare-components';
import { Intervention } from '../../../planning/types/interventions';
import { MESSAGES } from '../../messages';

type Props = {
    intervention: Intervention;
    onEditInterventionCost: (intervention: Intervention) => void;
};

export const InterventionRow: React.FC<Props> = ({
    intervention,
    onEditInterventionCost,
}) => (
    <Box
        key={intervention.id}
        sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        }}
    >
        <Typography variant="subtitle2" color="textSecondary">
            {intervention.name}
        </Typography>
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
            }}
        >
            <Typography
                variant="subtitle2"
                color="textPrimary"
                sx={{
                    textAlign: 'right',
                    fontWeight: 'bold',
                    marginRight: 2,
                }}
            >
                {intervention.cost_per_unit ?? 'N/A'}
                {intervention.unit}
            </Typography>
            <IconButton
                onClick={() => onEditInterventionCost(intervention)}
                iconSize="small"
                tooltipMessage={MESSAGES.editCost}
                overrideIcon={EditIcon}
            />
        </Box>
    </Box>
);
