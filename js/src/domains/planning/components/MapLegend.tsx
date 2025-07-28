import React, { FunctionComponent } from 'react';
import { Paper, Box, Theme } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
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
    legendUnit: (theme: Theme) => ({
        padding: theme.spacing(0.5, 1),
    }),
};

type Props = {
    legendConfig: {
        units: string;
        legend_type: string; // 'linear' | 'ordinal' | 'threshold';
        legend_config: any;
        unit_symbol: string;
    };
};

export const MapLegend: FunctionComponent<Props> = ({ legendConfig }) => {
    return (
        <Paper elevation={1} sx={styles.root}>
            <Box sx={styles.legendUnit}>{legendConfig.units}</Box>
            <Box sx={styles.legendContainer}>
                {(() => {
                    if (legendConfig.legend_type === 'linear') {
                        return (
                            <LinearLegend
                                domainAndRange={legendConfig.legend_config}
                            />
                        );
                    }
                    if (legendConfig.legend_type === 'ordinal') {
                        return (
                            <OrdinalLegend
                                domainAndRange={legendConfig.legend_config}
                            />
                        );
                    }
                    return (
                        <ThresholdLegend
                            threshold={legendConfig.legend_config}
                            unit={legendConfig.unit_symbol}
                        />
                    );
                })()}
            </Box>
        </Paper>
    );
};
