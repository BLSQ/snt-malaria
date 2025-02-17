import React, { FC } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Drawer, IconButton } from '@mui/material';
import { MetricConfig } from './MetricConfig';
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
                <IconButton
                    aria-label="close"
                    onClick={toggleDrawer}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                    <CloseIcon />
                </IconButton>
                <Box sx={{ mt: 3 }}>
                    {metricTypes?.length &&
                        metricTypes.map(metric => (
                            <MetricConfig
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
