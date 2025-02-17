import React, { FC } from 'react';
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { Box, Drawer, IconButton, Typography } from '@mui/material';
import { LayerConfig } from './layers/LayerConfig';
import { LayerHeader } from './layers/LayerHeader';
import { MetricType } from '../types/metrics';

type Props = {
    toggleDrawer: () => void;
    isDrawerOpen: boolean;
    metricTypes?: MetricType[];
    displayedMetric: MetricType | null;
    toggleMetricSelection: (metric: MetricType) => void;
};

export const LayersDrawer: FC<Props> = ({
    toggleDrawer,
    isDrawerOpen,
    metricTypes,
    displayedMetric,
    toggleMetricSelection,
}) => {
    return (
        <Drawer anchor="left" open={isDrawerOpen} onClose={toggleDrawer}>
            <Box
                sx={{ width: 350, p: 2, position: 'relative' }}
                role="presentation"
                onClick={toggleDrawer}
                onKeyDown={toggleDrawer}
            >
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                    }}
                >
                    <span>
                        <LayersOutlinedIcon />
                        Layers
                    </span>
                    <IconButton
                        aria-label="close"
                        onClick={toggleDrawer}
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                    >
                        <ChevronLeftOutlinedIcon />
                    </IconButton>
                </Box>
                <Box sx={{ mt: 3 }}>
                    {metricTypes?.length &&
                        metricTypes.map(metric => (
                            <LayerConfig
                                key={metric.id}
                                metric={metric}
                                isSelected={displayedMetric?.id === metric.id}
                                toggleMapDisplay={() =>
                                    toggleMetricSelection(metric)
                                }
                            />
                        ))}
                </Box>
            </Box>
        </Drawer>
    );
};
