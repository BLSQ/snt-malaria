import React, { FC } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import { MetricType } from '../types/metrics';

type Props = {
    metric: MetricType;
    isSelected: boolean;
    toggleMapDisplay: () => void;
};

export const MetricConfig: FC<Props> = ({
    metric,
    isSelected,
    toggleMapDisplay,
}) => {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
            }}
        >
            <Typography
                variant="body1"
                sx={{ textDecoration: isSelected ? 'underline' : 'none' }}
            >
                {metric.name}
            </Typography>
            <IconButton
                onClick={toggleMapDisplay}
                aria-label="toggle selection"
            >
                {isSelected ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>
        </Box>
    );
};
