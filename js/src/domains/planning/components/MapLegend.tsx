import React, { FunctionComponent } from 'react';
import { Paper, Box, Theme, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { MetricType } from '../types/metrics';
import { LinearLegend } from './legend/LinearLegend';
import { OrdinalLegend } from './legend/OrdinalLegend';
import { ThresholdLegend } from './legend/ThresholdLegend';

const styles: SxStyles = {
    root: (theme: Theme) => ({
        position: 'absolute', // assuming you have a parent relative
        zIndex: 500,
        top: 'auto',
        right: 'auto',
        left: theme.spacing(1),
        bottom: theme.spacing(1),
        width: 'auto',
        backgroundColor: '#1F2B3DBF',
        color: 'white',
        borderRadius: '8px',
        maxWidth: '90%',
    }),
    legendContainer: (theme: Theme) => ({
        padding: theme.spacing(0.5, 1),
        display: 'flex',
        gap: 2,
        flexFlow: 'wrap',
    }),
};

type Props = {
    metric: MetricType;
};

export const MapLegend: FunctionComponent<Props> = ({ metric }) => {
    return (
        <Paper elevation={1} sx={styles.root}>
            <Box sx={styles.legendContainer}>
                {metric.legend_type === 'linear' ? (
                    <LinearLegend domainAndRange={metric.legend_config} />
                ) : metric.legend_type === 'ordinal' ? (
                    <OrdinalLegend domainAndRange={metric.legend_config} />
                ) : (
                    <ThresholdLegend
                        threshold={metric.legend_config}
                        unit={metric.unit_symbol}
                    />
                )}
            </Box>
        </Paper>
    );
};
