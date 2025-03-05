import React, { FC } from 'react';
import { Drawer } from '@mui/material';

import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { MetricsFilters, MetricType } from '../types/metrics';
import { LayersDrawerContents } from './layers/LayersDrawerContents';

type Props = {
    toggleDrawer: () => void;
    isDrawerOpen: boolean;
    displayedMetric: MetricType | null;
    selectedOrgUnits: OrgUnit[];
    onDisplayMetricOnMap: (metric: MetricType) => void;
    onSelectOrgUnits: (filters: MetricsFilters) => void;
    onClearOrgUnitSelection: () => void;
};

export const LayersDrawer: FC<Props> = ({
    toggleDrawer,
    isDrawerOpen,
    displayedMetric,
    selectedOrgUnits,
    onDisplayMetricOnMap,
    onSelectOrgUnits,
    onClearOrgUnitSelection,
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
                selectedOrgUnits={selectedOrgUnits}
                onDisplayMetricOnMap={onDisplayMetricOnMap}
                onSelectOrgUnits={onSelectOrgUnits}
                onClearOrgUnitSelection={onClearOrgUnitSelection}
            />
        </Drawer>
    );
};
