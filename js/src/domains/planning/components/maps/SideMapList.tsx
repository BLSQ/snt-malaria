import React, { FC, useCallback, useState } from 'react';
import { Box, Theme } from '@mui/material';

import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';

import { MetricType, MetricTypeCategory } from '../../types/metrics';
import { SideMap } from './SideMap';
import { LayerSelect } from './LayerSelect';

const styles: SxStyles = {
    mainBox: (theme: Theme) => ({
        borderRadius: theme.spacing(2),
        overflowY: 'scroll',
        position: 'relative',
        height: '100%',
    }),
    addNewSideMapBox: {
        height: 108,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px dashed #B0BEC5',
        borderRadius: 2,
        p: 2,
    },
};

type Props = {
    orgUnits: OrgUnit[];
    metricCategories: MetricTypeCategory[];
};
export const SideMapList: FC<Props> = ({ orgUnits, metricCategories }) => {
    const [sideMaps, setSideMaps] = useState<MetricType[]>([
        // TODO: temporary for development purposes
        metricCategories[0].items[0],
        metricCategories[0].items[1],
    ]);

    const handleAddSideMap = useCallback(
        (metric: MetricType) => {
            setSideMaps([...sideMaps, metric]);
        },
        [sideMaps],
    );

    return (
        <Box sx={styles.mainBox}>
            {sideMaps.map((metric, index) => (
                <SideMap
                    key={index}
                    orgUnits={orgUnits}
                    initialDisplayedMetric={metric}
                />
            ))}
            {sideMaps.length < 5 && ( // we allow max 5 maps to be displayed
                <Box sx={styles.addNewSideMapBox}>
                    <LayerSelect
                        createsNewMap={true}
                        metricCategories={metricCategories}
                        onLayerChange={handleAddSideMap}
                    />
                </Box>
            )}
        </Box>
    );
};
