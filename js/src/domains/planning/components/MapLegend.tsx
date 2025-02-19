import React, { FunctionComponent } from 'react';
import { Paper, Box, Theme, Typography } from '@mui/material';

import { ScaleThreshold } from 'Iaso/components/LegendBuilder/types';
import { Legend } from 'Iaso/components/LegendBuilder/Legend';
import { SxStyles } from 'Iaso/types/general';

const styles: SxStyles = {
    root: (theme: Theme) => ({
        position: 'absolute', // assuming you have a parent relative
        zIndex: 500,
        top: 'auto',
        right: 'auto',
        left: theme.spacing(1),
        bottom: theme.spacing(1),
        width: 'auto',
        backgroundColor: '#333D43',
        color: 'white',
    }),
    legendContainer: (theme: Theme) => ({
        padding: theme.spacing(2, 2, 1, 2),
    }),
};

type Props = {
    title: string;
    threshold: ScaleThreshold;
};

export const MapLegend: FunctionComponent<Props> = ({ title, threshold }) => {
    return (
        <Paper elevation={1} sx={styles.root}>
            <Box sx={styles.legendContainer}>
                <Typography variant="caption">{title}</Typography>
                <Legend threshold={threshold} />
            </Box>
        </Paper>
    );
};
