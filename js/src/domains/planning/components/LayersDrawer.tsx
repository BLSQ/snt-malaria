import React, { FC } from 'react';
import { Drawer } from '@mui/material';
import { MetricType } from '../types/metrics';
import { LayersDrawerContents } from './layers/LayersDrawerContents';

type Props = {
    toggleDrawer: () => void;
    isDrawerOpen: boolean;
    displayedMetric: MetricType | null;
    displayMetricOnMap: (metric: MetricType) => void;
    onSelectOrgUnits: () => void;
};

export const LayersDrawer: FC<Props> = ({
    toggleDrawer,
    isDrawerOpen,
    displayedMetric,
    displayMetricOnMap,
    onSelectOrgUnits,
}) => {
    return (
        <Drawer
            anchor="left"
            open={isDrawerOpen}
            hideBackdrop={true}
            PaperProps={{
                sx: {
                    borderRadius: theme => theme.spacing(2),
                    height: 'auto',
                    top: '15vh',
                    marginLeft: '40px', // 16 + 16 + 8
                },
            }}
            // onClose={toggleDrawer} // Close by clicking outside, not sure if we want this
        >
            <LayersDrawerContents
                toggleDrawer={toggleDrawer}
                displayedMetric={displayedMetric}
                displayMetricOnMap={displayMetricOnMap}
                onSelectOrgUnits={onSelectOrgUnits}
            />
        </Drawer>
    );
};
