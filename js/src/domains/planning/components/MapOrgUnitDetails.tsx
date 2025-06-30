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
    styled,
} from '@mui/material';

import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';

import {
    useGetMetricCategories,
    useGetMetricValues,
} from '../hooks/useGetMetrics';
import { MESSAGES } from '../messages';
import { MetricType, MetricTypeCategory, MetricValue } from '../types/metrics';

type Props = {
    clickedOrgUnit: OrgUnit;
    onClear: () => void;
    onAddRemoveOrgUnitToMix: (selectedOrgUnit: any) => void;
    selectedOrgUnits: OrgUnit[];
    highlightMetricType: MetricType | null;
};

const ListItemStyled = styled(ListItem)`
    &:nth-of-type(odd) {
        background-color: #eceff1;
    }
`;

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
        maxWidth: '356px',
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
        minWidth: 80,
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
        // paddingLeft: 0,
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
    onAddRemoveOrgUnitToMix,
    selectedOrgUnits,
    highlightMetricType,
}) => {
    const { data: metricCategories } = useGetMetricCategories();
    const flatMetricTypes = useMemo(() => {
        return (metricCategories || []).reduce(
            (acc, category: MetricTypeCategory) => {
                category.items.forEach((metric: MetricType) => {
                    acc[metric.id] = metric;
                });
                return acc;
            },
            {},
        );
    }, [metricCategories]);

    const { data: metricValues, isLoading } = useGetMetricValues({
        orgUnitId: clickedOrgUnit.id,
    });

    const isOrgUnitSelected = useMemo(
        () => selectedOrgUnits.some(unit => unit.id === clickedOrgUnit.id),
        [clickedOrgUnit.id, selectedOrgUnits],
    );

    const { formatMessage } = useSafeIntl();

    const getMetricFontWeight = (orgUnitMetric: MetricValue) =>
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
                    onClick={() => onAddRemoveOrgUnitToMix(clickedOrgUnit)}
                    sx={styles.button}
                >
                    {isOrgUnitSelected
                        ? formatMessage(MESSAGES.removeOrgUnitFromMix)
                        : formatMessage(MESSAGES.addOrgUnitFromMix)}
                </Button>
                <IconButton
                    className="Mui-focusVisible"
                    size="small"
                    disableRipple={true}
                    aria-label="close"
                    onClick={onClear}
                    sx={styles.closeIconButton}
                >
                    <CloseOutlinedIcon sx={styles.closeIcon} />
                </IconButton>
            </Box>
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
                                <ListItemStyled
                                    key={metricValue.id}
                                    sx={(theme: Theme) => ({
                                        display: 'flex',
                                        justifyContent: 'space-between',
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
                                    })}
                                >
                                    <Typography variant="caption">
                                        {metricDetails.name || 'Unknown Metric'}
                                    </Typography>
                                    <Typography variant="caption">
                                        {Intl.NumberFormat().format(
                                            metricValue.value,
                                        )}
                                    </Typography>
                                </ListItemStyled>
                            </Tooltip>
                        );
                    })}
            </List>
        </Box>
    );
};
