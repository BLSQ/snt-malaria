import React, { FC, useCallback, useEffect, useState } from 'react';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import {
    Card,
    MenuItem,
    Select,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    IconButton,
    LoadingSpinner,
    useRedirectToReplace,
} from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { CardStyled } from '../../../components/CardStyled';
import { OrgUnitSelect } from '../../../components/OrgUnitSelect';
import { baseUrls } from '../../../constants/urls';
import { MESSAGES } from '../../messages';
import { useGetMetricValues } from '../hooks/useGetMetrics';
import { MetricType, MetricValue } from '../types/metrics';
import { DataLayerMap } from './DataLayerMap';

const styles = {
    card: {
        flexGrow: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    smallHeader: {
        minHeight: '36px',
    },
};

type Props = {
    metricType?: MetricType;
    orgUnits?: OrgUnit[];
    displayOrgUnitId?: number;
    small?: boolean;
    onRemove?: () => void;
};

export const DataLayerMapWrapper: FC<Props> = ({
    metricType,
    orgUnits,
    displayOrgUnitId,
    small = false,
    onRemove,
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
            // For non population metrics, we don't want to split by year as they are not time-sensitive
            setMetricValuesPerYear({ 0: metricValues });
            setYearOptions([]);
            setYear('0');
            return;
        }

        const valuesByYear: Record<number, MetricValue[]> = {};
        const years = new Set<number>();
        for (const metricValue of metricValues) {
            const metricYear = metricValue.year || 0;
            if (!valuesByYear[metricYear]) {
                valuesByYear[metricYear] = [];
                years.add(metricYear);
            }
            valuesByYear[metricYear].push(metricValue);
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
                headerSx={small ? styles.smallHeader : undefined}
                header={
                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        overflow="hidden"
                    >
                        <Tooltip title={metricType?.name || ''}>
                            <Typography
                                variant={small ? 'body2' : 'h6'}
                                noWrap
                                sx={{ flex: 1, minWidth: 0, paddingRight: 1 }}
                            >
                                {metricType?.name || ''}
                            </Typography>
                        </Tooltip>
                        <Stack
                            direction="row"
                            spacing={2}
                            alignItems="end"
                            sx={{ flexShrink: 0 }}
                        >
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
                            {small ? null : (
                                <OrgUnitSelect
                                    onOrgUnitChange={handleDisplayOrgUnitChange}
                                    selectedOrgUnitId={displayOrgUnitId}
                                />
                            )}
                            {(onRemove && (
                                <IconButton
                                    overrideIcon={CancelOutlinedIcon}
                                    tooltipMessage={MESSAGES.remove}
                                    onClick={onRemove}
                                ></IconButton>
                            )) ||
                                null}
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
