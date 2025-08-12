import React, { FC, useMemo } from 'react';
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
    Theme,
} from '@mui/material';

import { blueGrey } from '@mui/material/colors';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';

import { MESSAGES } from '../../messages';
import {
    useGetMetricCategories,
    useGetMetricValues,
} from '../hooks/useGetMetrics';
import { MetricType } from '../types/metrics';

type Props = {
    clickedOrgUnit: OrgUnit;
    onClear: () => void;
    onAddRemoveOrgUnit: (selectedOrgUnit: any) => void;
    selectedOrgUnits: OrgUnit[];
    highlightMetricType: MetricType | null;
};

const styles: SxStyles = {
    mainBox: (theme: Theme) => ({
        position: 'absolute',
        top: 72,
        left: 8,
        backgroundColor: 'white',
        color: theme.palette.text.primary,
        padding: '10px',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        maxWidth: '390px',
        width: '390px',
        maxHeight: 'calc(100% - 90px)',
        overflow: 'auto',
    }),
    buttonsBox: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    button: {
        fontSize: '0.8125rem',
        fontWeight: 'medium',
        textTransform: 'none',
        minWidth: 55,
    },
    title: (theme: Theme) => ({
        marginRight: theme.spacing(1),
        flexGrow: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    }),
    closeIconButton: (theme: Theme) => ({
        color: theme.palette.text.primary,
        paddingRight: 0,
    }),
    closeIcon: {
        height: '.8em',
        width: '.8em',
    },
};

export const MapOrgUnitDetails: FC<Props> = ({
    clickedOrgUnit,
    onClear,
    onAddRemoveOrgUnit,
    selectedOrgUnits,
    highlightMetricType,
}) => {
    const { data: metricCategories } = useGetMetricCategories();

    const { data: metricValues, isLoading } = useGetMetricValues({
        orgUnitId: clickedOrgUnit.id,
    });

    const metricTypes = useMemo(
        () =>
            metricCategories?.reduce((acc, curr, index) => {
                return [
                    ...acc,
                    ...curr.items.map(i => ({ ...i, categoryId: index })),
                ];
            }, []),
        [metricCategories],
    );

    const groupedMetricValues: {
        [categoryId: string]: {
            id: number;
            description: string;
            name: string;
            value: number;
            metric_type: number;
            category: number;
        }[];
    } = useMemo(
        () =>
            metricValues?.reduce((groups, curr) => {
                const metricType = metricTypes?.find(
                    c => c.id === curr.metric_type,
                );

                if (!metricType) {
                    return groups;
                }

                const categoryId = metricType.categoryId ?? 9999999;
                const newValue = { ...metricType, value: curr.value };

                const existingValues = groups[categoryId] ?? [];

                return {
                    ...groups,
                    [categoryId]: [...existingValues, newValue],
                };
            }, {}) ?? {},
        [metricValues, metricTypes],
    );

    const isOrgUnitSelected = useMemo(
        () => selectedOrgUnits.some(unit => unit.id === clickedOrgUnit.id),
        [clickedOrgUnit.id, selectedOrgUnits],
    );

    const { formatMessage } = useSafeIntl();

    const getMetricFontWeight = (orgUnitMetric: { metric_type: number }) =>
        highlightMetricType &&
        orgUnitMetric.metric_type === highlightMetricType.id
            ? 'bold'
            : 'normal';

    return (
        <Box sx={styles.mainBox}>
            <Box sx={styles.buttonsBox}>
                <Typography variant="body1" sx={styles.title}>
                    {clickedOrgUnit.name}
                </Typography>
                <Button
                    variant="text"
                    color="primary"
                    size="small"
                    onClick={() => onAddRemoveOrgUnit(clickedOrgUnit)}
                    sx={styles.button}
                >
                    {isOrgUnitSelected
                        ? formatMessage(MESSAGES.remove)
                        : formatMessage(MESSAGES.add)}
                </Button>
                <IconButton
                    className="Mui-focusVisible"
                    size="small"
                    disableRipple
                    aria-label="close"
                    onClick={onClear}
                    sx={styles.closeIconButton}
                >
                    <CloseOutlinedIcon sx={styles.closeIcon} />
                </IconButton>
            </Box>
            {isLoading && <CircularProgress size={24} />}
            <Box>
                {!isLoading &&
                    metricValues &&
                    Object.entries(groupedMetricValues).map(([_, values]) => {
                        const categoryName = values[0].category;
                        return (
                            <>
                                {categoryName ? (
                                    <Typography
                                        variant="overline"
                                        color="textSecondary"
                                    >
                                        {categoryName}
                                    </Typography>
                                ) : null}
                                <List>
                                    {values.map(metricValue => (
                                        <Tooltip
                                            key={metricValue.id}
                                            title={
                                                metricValue?.description ??
                                                'No description available'
                                            }
                                            arrow
                                        >
                                            <ListItem
                                                key={metricValue.id}
                                                sx={(theme: Theme) => ({
                                                    display: 'flex',
                                                    justifyContent:
                                                        'space-between',
                                                    width: '100%',
                                                    gap: '2rem',
                                                    padding: theme.spacing(1),
                                                    borderRadius: 1,
                                                    ' > *': {
                                                        fontWeight:
                                                            getMetricFontWeight(
                                                                metricValue,
                                                            ),
                                                    },
                                                    ':hover': {
                                                        backgroundColor:
                                                            blueGrey[50],
                                                    },
                                                })}
                                            >
                                                <Typography variant="caption">
                                                    {metricValue?.name ??
                                                        'Unknown Metric'}
                                                </Typography>
                                                <Typography variant="caption">
                                                    {Intl.NumberFormat().format(
                                                        metricValue.value,
                                                    )}
                                                </Typography>
                                            </ListItem>
                                        </Tooltip>
                                    ))}
                                </List>
                            </>
                        );
                    })}
            </Box>
        </Box>
    );
};
