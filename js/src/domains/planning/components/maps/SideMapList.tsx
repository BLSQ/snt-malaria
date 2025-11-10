import React, { FC, useCallback, useEffect, useState } from 'react';
import { Box, Theme } from '@mui/material';

import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';

import { MetricType, MetricTypeCategory } from '../../types/metrics';
import { LayerSelect } from './LayerSelect';
import { SideMap } from './SideMap';

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
    const [sideMaps, setSideMaps] = useState<MetricType[]>([]);
    useEffect(() => {
        if (metricCategories.length > 2) {
            setSideMaps([
                metricCategories[1].items[0],
                metricCategories[2].items[0],
            ]);
        } else if (metricCategories.length > 1) {
            setSideMaps([metricCategories[1].items[0]]);
        }
    }, [metricCategories, setSideMaps]);

    const handleAddSideMap = useCallback(
        (metric: MetricType) => {
            setSideMaps([...sideMaps, metric]);
        },
        [sideMaps],
    );

    return (
        <Box sx={styles.mainBox}>
            {sideMaps.map(metric => (
                <SideMap
                    key={`${metric.category}-${metric.id}`}
                    orgUnits={orgUnits}
                    initialDisplayedMetric={metric}
                />
            ))}
            {sideMaps.length < 5 && ( // we allow max 5 maps to be displayed
                <Box sx={styles.addNewSideMapBox}>
                    <LayerSelect
                        createsNewMap
                        onLayerChange={handleAddSideMap}
                    />
                </Box>
            )}
        </Box>
    );
};
