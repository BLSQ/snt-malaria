import React, { FC, useCallback, useMemo, useState } from 'react';
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import { Box, Button, Divider, IconButton, Theme } from '@mui/material';
import { useSafeIntl, LoadingSpinner } from 'bluesquare-components';

import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { useGetMetricTypes } from '../../hooks/useGetMetrics';
import { MESSAGES } from '../../messages';
import { MetricsFilters, MetricType } from '../../types/metrics';
import { LayerConfigBlock } from './LayerConfigBlock';
import { LayersTitleWithIcon } from './LayersTitleWithIcon';

const styles: SxStyles = {
    mainBox: {
        minHeight: 100,
        minWidth: 350,
        position: 'relative',
    },
    headerBox: (theme: Theme) => ({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: theme.spacing(1),
    }),
    metricsBox: {
        maxHeight: 'calc(80vh - 144px)', // 144px is the height to the top of the page
        overflowY: 'scroll',
        scrollbarWidth: 'thin',
        width: 'fit-content',
    },
    layersIconBox: (theme: Theme) => ({
        marginRight: theme.spacing(1),
        backgroundColor: '#EDE7F6',
        padding: '4px',
        borderRadius: '8px',
    }),
    layersIcon: (theme: Theme) => ({
        color: theme.palette.primary.main,
        width: '24px',
        height: 'auto',
        marginTop: '1px',
        marginBottom: '-1px',
    }),
    title: {
        flexGrow: 1,
    },
    chevronIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    footerBox: (theme: Theme) => ({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: theme.spacing(1),
    }),
    selectBtn: {
        color: 'white',
        fontSize: '0.875rem',
        fontWeight: 'bold',
        textTransform: 'none',
        marginLeft: '8px',
    },
    clearBtn: {
        fontSize: '0.875rem',
        fontWeight: 'bold',
        textTransform: 'none',
        marginRight: '8px',
    },
};

type Props = {
    toggleDrawer: () => void;
    displayedMetric: MetricType | null;
    selectedOrgUnits: OrgUnit[];
    onDisplayMetricOnMap: (metric: MetricType) => void;
    onSelectOrgUnits: (filters: MetricsFilters) => void;
    onClearOrgUnitSelection: () => void;
};

export const LayersDrawerContents: FC<Props> = ({
    toggleDrawer,
    displayedMetric,
    selectedOrgUnits,
    onDisplayMetricOnMap,
    onSelectOrgUnits,
    onClearOrgUnitSelection,
}) => {
    const { data: metricTypes, isLoading } = useGetMetricTypes();
    const { formatMessage } = useSafeIntl();

    const [filtersState, setFiltersState] = useState({});
    const handleFilterChange = useCallback(
        (
            metricCategory: string,
            metricId: number,
            filterValue: number | null,
        ) => {
            setFiltersState(prevState => {
                if (filterValue) {
                    return {
                        ...prevState,
                        [metricCategory]: {
                            [metricId]: filterValue,
                        },
                    };
                }

                delete prevState[metricCategory];
                return { ...prevState };
            });
        },
        [],
    );

    const activeFilterCount = useMemo(
        () => Object.keys(filtersState).length,
        [filtersState],
    );

    if (isLoading || !metricTypes) {
        return (
            <Box sx={styles.mainBox} role="presentation">
                <LoadingSpinner fixed={false} padding={40} size={25} />
            </Box>
        );
    }

    return (
        <Box sx={styles.mainBox} role="presentation">
            <Box sx={styles.headerBox}>
                <LayersTitleWithIcon />
                <IconButton
                    aria-label="close"
                    onClick={toggleDrawer}
                    sx={styles.chevronIcon}
                >
                    <ChevronLeftOutlinedIcon />
                </IconButton>
            </Box>
            <Divider />
            <Box sx={styles.metricsBox}>
                {Object.keys(metricTypes).map(metricCategory => {
                    if (metricCategory !== 'Population') {
                        return (
                            <Box key={metricCategory}>
                                <LayerConfigBlock
                                    metricCategory={metricCategory}
                                    metrics={metricTypes[metricCategory]}
                                    isDisplayedOnMap={
                                        displayedMetric?.category ===
                                        metricCategory
                                    }
                                    toggleMapDisplay={onDisplayMetricOnMap}
                                    filtersState={filtersState}
                                    onFilterChange={handleFilterChange}
                                />
                                <Divider />
                            </Box>
                        );
                    }
                })}
            </Box>
            <Divider />
            <Box sx={styles.footerBox}>
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => onSelectOrgUnits(filtersState)}
                    sx={styles.selectBtn}
                    disabled={activeFilterCount === 0}
                >
                    {activeFilterCount === 1
                        ? formatMessage(MESSAGES.selectOrgUnitsBtnOneFilter)
                        : formatMessage(MESSAGES.selectOrgUnitsBtn, {
                              amount: activeFilterCount,
                          })}
                </Button>
                {selectedOrgUnits.length > 0 && (
                    <Button
                        variant="text"
                        color="primary"
                        size="small"
                        onClick={() => onClearOrgUnitSelection()}
                        sx={styles.clearBtn}
                    >
                        {formatMessage(MESSAGES.clearOrgUnitSelection)}
                    </Button>
                )}
            </Box>
        </Box>
    );
};
