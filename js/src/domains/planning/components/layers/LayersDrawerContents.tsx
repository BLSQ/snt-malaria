import React, { FC } from 'react';
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { Box, Divider, IconButton, Theme, Typography } from '@mui/material';
import { MetricType } from '../../types/metrics';
import { LayerConfigBlock } from './LayerConfigBlock';
import { SxStyles } from 'Iaso/types/general';
import { useGetMetricTypes } from '../../hooks/useGetMetrics';
import { LoadingSpinner } from 'bluesquare-components';

const styles: SxStyles = {
    mainBox: { minHeight: 100, width: 350, position: 'relative' },
    headerBox: (theme: Theme) => ({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: theme.spacing(1),
    }),
    layersIconBox: (theme: Theme) => ({
        marginRight: theme.spacing(1),
        backgroundColor: '#EDE7F6',
        padding: '4px',
        borderRadius: '8px',
    }),
    layersIcon: (theme: Theme) => ({
        color: theme.palette.primary.main,
        width: '24px',
        height: 'auto',
        marginTop: '1px',
        marginBottom: '-1px',
    }),
    title: {
        flexGrow: 1,
    },
    chevronIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
};

type Props = {
    toggleDrawer: () => void;
    displayedMetric: MetricType | null;
    displayMetricOnMap: (metric: MetricType) => void;
    onSelectOrgUnits: () => void;
};

export const LayersDrawerContents: FC<Props> = ({
    toggleDrawer,
    // metricTypes,
    displayedMetric,
    displayMetricOnMap,
    onSelectOrgUnits,
}) => {
    const { data: metricTypes, isLoading } = useGetMetricTypes();

    if (isLoading) {
        return (
            <Box sx={styles.mainBox} role="presentation">
                <LoadingSpinner fixed={false} padding={40} size={25} />
            </Box>
        );
    }

    return (
        <Box sx={styles.mainBox} role="presentation">
            <Box sx={styles.headerBox}>
                <Box sx={styles.layersIconBox}>
                    <LayersOutlinedIcon sx={styles.layersIcon} />
                </Box>
                <Typography variant="h6" sx={styles.title}>
                    Layers
                </Typography>
                <IconButton
                    aria-label="close"
                    onClick={toggleDrawer}
                    sx={styles.chevronIcon}
                >
                    <ChevronLeftOutlinedIcon />
                </IconButton>
            </Box>
            <Divider />
            {Object.keys(metricTypes).map(metricCategory => {
                if (metricCategory !== 'Population') {
                    return (
                        <Box key={metricCategory}>
                            <LayerConfigBlock
                                metrics={metricTypes[metricCategory]}
                                isDisplayedOnMap={
                                    displayedMetric?.category === metricCategory
                                }
                                toggleMapDisplay={displayMetricOnMap}
                                onSelectOrgUnits={onSelectOrgUnits}
                            />
                            <Divider />
                        </Box>
                    );
                }
            })}
        </Box>
    );
};
