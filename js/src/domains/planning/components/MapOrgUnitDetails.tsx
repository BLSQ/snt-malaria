import React, { FC, useMemo } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import {
    Box,
    Button,
    CircularProgress,
    List,
    ListItem,
    IconButton,
    Tooltip,
    Typography,
} from '@mui/material';

import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';

import { useGetMetricTypes, useGetMetricValues } from '../hooks/useGetMetrics';
import { MESSAGES } from '../messages';
import { MetricType } from '../types/metrics';

type Props = {
    clickedOrgUnit: OrgUnit;
    onClear: () => void;
    onAddRemoveOrgUnitToMix: (selectedOrgUnit: any) => void;
    selectedOrgUnits: OrgUnit[];
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
        minWidth: '280px',
    },
    buttonsBox: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    title: {
        marginTop: '8px',
        fontSize: '1rem',
        textTransform: 'none',
    },
    listItem: {
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        gap: '2rem',
        padding: 0,
    },
    metricValue: {
        color: 'white',
    },
    button: {
        color: 'white',
        fontSize: '0.875rem',
        fontWeight: 'bold',
        textTransform: 'none',
    },
    closeIcon: {
        color: 'white',
        paddingLeft: 0,
    },
};

export const MapOrgUnitDetails: FC<Props> = ({
    clickedOrgUnit,
    onClear,
    onAddRemoveOrgUnitToMix,
    selectedOrgUnits,
}) => {
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
        orgUnitId: clickedOrgUnit.id,
    });

    const isOrgUnitSelected = useMemo(
        () => selectedOrgUnits.some(unit => unit.id === clickedOrgUnit.id),
        [clickedOrgUnit.id, selectedOrgUnits],
    );

    const { formatMessage } = useSafeIntl();

    return (
        <Box sx={styles.mainBox}>
            <Box sx={styles.buttonsBox}>
                <IconButton
                    aria-label="close"
                    onClick={onClear}
                    sx={styles.closeIcon}
                >
                    <CloseOutlinedIcon />
                </IconButton>
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    endIcon={
                        isOrgUnitSelected ? <ArrowBackIcon /> : <ArrowForward />
                    }
                    onClick={() => onAddRemoveOrgUnitToMix(clickedOrgUnit)}
                    sx={styles.button}
                >
                    {isOrgUnitSelected
                        ? formatMessage(MESSAGES.removeOrgUnitFromMix)
                        : formatMessage(MESSAGES.addOrgUnitFromMix)}
                </Button>
            </Box>

            <Typography variant="h6" sx={styles.title}>
                {clickedOrgUnit.name}
            </Typography>

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
                                <ListItem
                                    key={metricValue.id}
                                    sx={styles.listItem}
                                >
                                    <Typography variant="caption">
                                        {metricDetails.name || 'Unknown Metric'}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={styles.metricValue}
                                    >
                                        {Intl.NumberFormat().format(
                                            metricValue.value,
                                        )}
                                    </Typography>
                                </ListItem>
                            </Tooltip>
                        );
                    })}
            </List>
        </Box>
    );
};
