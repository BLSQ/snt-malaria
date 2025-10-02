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
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        marginTop: 1,
        marginBottom: 1,
    },
    actionWrapper: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cost: {
        fontWeight: 'bold',
        marginRight: 2,
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
        <Box sx={styles.actionWrapper}>
            <Box>
                <Typography
                    variant="subtitle2"
                    color="textPrimary"
                    sx={styles.cost}
                >
                    {intervention.unit_cost
                        ? `$${intervention.unit_cost}`
                        : 'N/A'}
                </Typography>
                {intervention.unit_type && (
                    <Typography variant="caption" color="textSecondary">
                        {intervention.unit_type}
                    </Typography>
                )}
            </Box>
            <IconButton
                onClick={() => onEditInterventionCost(intervention)}
                iconSize="small"
                tooltipMessage={MESSAGES.editCost}
                overrideIcon={EditIcon}
            />
        </Box>
    </Box>
);
