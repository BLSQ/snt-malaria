import React, { FunctionComponent, useState } from 'react';
import { Paper, Box, Theme } from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
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
        padding: theme.spacing(1.1, 5, 1.1, 1),
        display: 'flex',
        gap: 2,
        flexFlow: 'wrap',
    }),
    legendUnit: (theme: Theme) => ({
        padding: theme.spacing(0.5, 1),
    }),
    closeBox: () => ({
        position: 'absolute',
        top: 0,
        right: 0,
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
    const [isStretched, setIsStretched] = useState(false);
    const toggleLegend = () => {
        setIsStretched(!isStretched);
    };

    const { formatMessage } = useSafeIntl();

    return (
        <Paper elevation={1} sx={styles.root}>
            {isStretched && legendConfig.units ? (
                <Box sx={styles.legendUnit}>{legendConfig.units}</Box>
            ) : null}
            {isStretched ? (
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
                    <Box sx={styles.closeBox}>
                        <IconButton
                            icon="clear"
                            iconSize="small"
                            onClick={toggleLegend}
                            tooltipMessage={MESSAGES.hideLegend}
                            color="white"
                        />
                    </Box>
                </Box>
            ) : (
                <Box
                    sx={styles.legendUnit}
                    onClick={toggleLegend}
                    style={{ cursor: 'pointer' }}
                >
                    {formatMessage(MESSAGES.showLegend)}
                </Box>
            )}
        </Paper>
    );
};
