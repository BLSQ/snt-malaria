import React, { FunctionComponent } from 'react';
import { Paper, Box, Theme, Typography } from '@mui/material';

import { ScaleThreshold } from 'Iaso/components/LegendBuilder/types';
import { Legend } from 'Iaso/components/LegendBuilder/Legend';
import { SxStyles } from 'Iaso/types/general';
import { MetricType } from '../types/metrics';

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
        borderRadius: '8px',
    }),
    legendContainer: (theme: Theme) => ({
        padding: theme.spacing(2, 2, 1, 2),
    }),
    name: (theme: Theme) => ({
        display: 'block',
        marginBottom: theme.spacing(1),
    }),
};

type Props = {
    metric: MetricType;
};

export const MapLegend: FunctionComponent<Props> = ({ metric }) => {
    return (
        <Paper elevation={1} sx={styles.root}>
            <Box sx={styles.legendContainer}>
                <Typography variant="caption" sx={styles.name}>
                    {metric.name}
                </Typography>
                <Legend
                    threshold={metric.legend_threshold}
                    unit={metric.unit_symbol}
                />
            </Box>
        </Paper>
    );
};
