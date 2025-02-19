import React, { FC, useMemo } from 'react';
import { Box, List, ListItem, Tooltip, Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';

import { useGetMetricTypes, useGetMetricValues } from '../hooks/useGetMetrics';
import { MetricType } from '../types/metrics';

type Props = {
    selectedOrgUnit: OrgUnit;
};

const styles: SxStyles = {
    mainBox: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#333D43',
        color: 'white',
        padding: '10px',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
    },
    metricValueBox: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
    },
    metricValue: {
        color: 'white',
    },
};

export const MapOrgUnitDetails: FC<Props> = ({ selectedOrgUnit }) => {
    const { data: metricTypes } = useGetMetricTypes();
    const flatMetricTypes = useMemo(() => {
        const flatMap = {};
        for (const category in metricTypes) {
            metricTypes[category].forEach((metric: MetricType) => {
                flatMap[metric.id] = metric;
            });
        }
        return flatMap;
    }, [metricTypes]);

    const { data: metricValues, isLoading } = useGetMetricValues({
        orgUnitId: selectedOrgUnit.id,
    });

    return (
        <Box sx={styles.mainBox}>
            <h3>{selectedOrgUnit.name}</h3>
            {isLoading && <CircularProgress size={24} />}
            <List>
                {!isLoading &&
                    metricValues &&
                    metricValues.map(metricValue => {
                        const metricDetails =
                            flatMetricTypes[metricValue.metric_type];
                        return (
                            <Tooltip
                                key={metricValue.id}
                                title={
                                    metricDetails
                                        ? metricDetails.description
                                        : 'No description available'
                                }
                                arrow
                            >
                                <ListItem key={metricValue.id}>
                                    <Box sx={styles.metricValueBox}>
                                        <Typography variant="caption">
                                            {metricDetails.name ||
                                                'Unknown Metric'}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={styles.metricValue}
                                        >
                                            {metricValue.value}
                                        </Typography>
                                    </Box>
                                </ListItem>
                            </Tooltip>
                        );
                    })}
            </List>
        </Box>
    );
};
