import React from 'react';
import EditIcon from '@mui/icons-material/Edit';
import { Box, Typography } from '@mui/material';
import { IconButton } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { Intervention } from '../../../planning/types/interventions';
import { MESSAGES } from '../../messages';

type Props = {
    intervention: Intervention;
    onEditInterventionCost: (intervention: Intervention) => void;
};

const styles: SxStyles = {
    row: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 1,
        marginBottom: 1,
    },
};

export const InterventionRow: React.FC<Props> = ({
    intervention,
    onEditInterventionCost,
}) => (
    <Box key={intervention.id} sx={styles.row}>
        <Typography variant="subtitle2" color="textSecondary">
            {intervention.name}
        </Typography>
        <IconButton
            onClick={() => onEditInterventionCost(intervention)}
            iconSize="small"
            tooltipMessage={MESSAGES.editCost}
            overrideIcon={EditIcon}
        />
    </Box>
);
