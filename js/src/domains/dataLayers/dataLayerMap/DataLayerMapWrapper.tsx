import React, { FC, useCallback, useEffect, useState } from 'react';
import { Card, MenuItem, Select, Stack, Typography } from '@mui/material';
import { LoadingSpinner, useRedirectToReplace } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { CardStyled } from '../../../components/CardStyled';
import { OrgUnitSelect } from '../../../components/OrgUnitSelect';
import { baseUrls } from '../../../constants/urls';
import { useGetMetricValues } from '../hooks/useGetMetrics';
import { MetricType, MetricValue } from '../types/metrics';
import { DataLayerMap } from './DataLayerMap';

const styles = {
    card: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
};

type Props = {
    metricType?: MetricType;
    orgUnits?: OrgUnit[];
    displayOrgUnitId?: number;
};

export const DataLayerMapWrapper: FC<Props> = ({
    metricType,
    orgUnits,
    displayOrgUnitId,
}) => {
    const { data: metricValues, isLoading: loadingMetricValues } =
        useGetMetricValues({
            metricTypeId: metricType?.id || null,
        });

    const redirectToReplace = useRedirectToReplace();

    const handleDisplayOrgUnitChange = useCallback(
        (orgUnitId?: number) => {
            redirectToReplace(baseUrls.dataLayers, {
                displayOrgUnitId: orgUnitId?.toString(),
            });
        },
        [redirectToReplace],
    );

    const [metricValuesPerYear, setMetricValuesPerYear] = useState<
        Record<number, MetricValue[]>
    >({});
    const [yearOptions, setYearOptions] = useState<number[]>([]);
    const [year, setYear] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!metricValues) return;

        if (metricType?.metric_kind !== 'population') {
            // For population metrics, we don't want to split by year as they are not time-sensitive
            setMetricValuesPerYear({ 0: metricValues });
            setYearOptions([]);
            setYear('0');
            return;
        }

        const valuesByYear: Record<number, MetricValue[]> = {};
        const years = new Set<number>();
        for (const metricValue of metricValues) {
            const year = metricValue.year || 0;
            if (!valuesByYear[year]) {
                valuesByYear[year] = [];
                years.add(year);
            }
            valuesByYear[year].push(metricValue);
        }
        setMetricValuesPerYear(valuesByYear);
        setYear([...years].sort((a, b) => b - a)[0]?.toString());
        setYearOptions([...years].sort((a, b) => b - a));
    }, [metricValues, metricType]);

    if (loadingMetricValues) {
        return <LoadingSpinner />;
    }

    return (
        <Card sx={styles.card}>
            <CardStyled
                header={
                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Typography variant="h6">
                            {metricType?.name || ''}
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="end">
                            {metricType?.metric_kind === 'population' && (
                                <Select
                                    value={year}
                                    onChange={e => setYear(e.target.value)}
                                    variant="outlined"
                                    displayEmpty
                                >
                                    {yearOptions.map(yearOption => (
                                        <MenuItem
                                            key={yearOption}
                                            value={yearOption}
                                        >
                                            {yearOption}
                                        </MenuItem>
                                    ))}
                                </Select>
                            )}

                            <OrgUnitSelect
                                onOrgUnitChange={handleDisplayOrgUnitChange}
                                selectedOrgUnitId={displayOrgUnitId}
                            />
                        </Stack>
                    </Stack>
                }
            >
                <DataLayerMap
                    metricType={metricType}
                    metricValues={
                        year ? metricValuesPerYear[parseInt(year)] : []
                    }
                    orgUnits={orgUnits || []}
                />
            </CardStyled>
        </Card>
    );
};
