import React, { FC } from 'react';
import { Drawer } from '@mui/material';
import { MetricsFilters, MetricType } from '../types/metrics';
import { LayersDrawerContents } from './layers/LayersDrawerContents';

type Props = {
    toggleDrawer: () => void;
    isDrawerOpen: boolean;
    displayedMetric: MetricType | null;
    onDisplayMetricOnMap: (metric: MetricType) => void;
    onSelectOrgUnits: (filters: MetricsFilters) => void;
};

export const LayersDrawer: FC<Props> = ({
    toggleDrawer,
    isDrawerOpen,
    displayedMetric,
    onDisplayMetricOnMap,
    onSelectOrgUnits,
}) => {
    return (
        <Drawer
            anchor="left"
            open={isDrawerOpen}
            variant="persistent"
            PaperProps={{
                sx: {
                    borderRadius: theme => theme.spacing(2),
                    height: 'auto',
                    top: '144px', // 64 + 16 + 40 + 16
                    marginLeft: '40px', // 16 + 16 + 8
                },
            }}
            // onClose={toggleDrawer} // Close by clicking outside, not sure if we want this
        >
            <LayersDrawerContents
                toggleDrawer={toggleDrawer}
                displayedMetric={displayedMetric}
                onDisplayMetricOnMap={onDisplayMetricOnMap}
                onSelectOrgUnits={onSelectOrgUnits}
            />
        </Drawer>
    );
};
