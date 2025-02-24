import React, { FC } from 'react';
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { Box, Divider, Drawer, IconButton } from '@mui/material';
import { MetricType } from '../types/metrics';
import { LayerConfigBlock } from './layers/LayerConfigBlock';

type Props = {
    toggleDrawer: () => void;
    isDrawerOpen: boolean;
    metricTypes?: MetricType[];
    displayedMetric: MetricType | null;
    displayMetricOnMap: (metric: MetricType) => void;
};

export const LayersDrawer: FC<Props> = ({
    toggleDrawer,
    isDrawerOpen,
    metricTypes,
    displayedMetric,
    displayMetricOnMap,
}) => {
    return (
        <Drawer
            anchor="left"
            open={isDrawerOpen}
            PaperProps={{
                sx: {
                    borderRadius: theme => theme.spacing(2),
                    height: '75vh',
                    top: '10vh',
                    marginLeft: '25px',
                },
            }}
            // onClose={toggleDrawer} // Close by clicking outside, not sure if we want this
        >
            <Box
                sx={{ width: 350, p: 2, position: 'relative' }}
                role="presentation"
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
                    {metricTypes &&
                        Object.keys(metricTypes).map(metricCategory => (
                            <Box key={metricCategory}>
                                <LayerConfigBlock
                                    metricCategory={metricCategory}
                                    metrics={metricTypes[metricCategory]}
                                    isDisplayedOnMap={
                                        displayedMetric?.category ===
                                        metricCategory
                                    }
                                    toggleMapDisplay={displayMetricOnMap}
                                />
                                <Divider />
                            </Box>
                        ))}
                </Box>
            </Box>
        </Drawer>
    );
};
