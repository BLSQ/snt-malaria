import React, { FC } from 'react';
import { PlaceOutlined } from '@mui/icons-material';
import { Box, Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { SxStyles } from 'Iaso/types/general';
import { ChartEmptyState } from '../../../../../components/charts/ChartEmptyState';
import { useChartTheme } from '../../../../../components/charts/chartTheme';
import { ChartTooltip } from '../../../../../components/charts/ChartTooltip';
import {
    AUTO_Y_AXIS_TICK_MARGIN,
    useAutoYAxisWidth,
} from '../../../../../components/useAutoYAxisWidth';
import { WidgetCard } from '../../../../../components/WidgetCard';
import { MESSAGES } from '../../../../messages';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import {
    getSlotInterventionDistrictCoverage,
    mergeSlotRowsByIntervention,
} from '../../../libs/comparison-aggregation';
import { formatPercentValue } from '../../../libs/cost-utils';
import { DistrictsRadarChart } from './DistrictsRadarChart';
import { OverlayGroupedBarChart } from './OverlayGroupedBarChart';

const CHART_HEIGHT = 280;
const BAR_SIZE = 16;
const Y_AXIS_MAX_LABEL = 'Dual AI (Campaign)';

const styles = {
    chartBody: {
        height: CHART_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
    },
    // flex:1 so ResponsiveContainer's height:100% resolves inside a Grid item.
    chartCanvas: {
        width: '100%',
        flex: 1,
        minHeight: 0,
    },
    sectionTitle: {
        fontWeight: 600,
        mb: 1,
    },
} satisfies SxStyles;

const percentOfTotal = (value: number, total?: number): string | undefined =>
    total ? formatPercentValue(value / total) : undefined;

export const DistrictsCoveredWidget: FC = () => {
    const { formatMessage } = useSafeIntl();
    const {
        slots,
        budgetsBySlotKey,
        isBudgetLoading,
        displayMode,
        totalDistrictCount,
    } = useScenarioComparisonContext();
    const { gridProps, axisProps } = useChartTheme();

    const coverageBySlotIndex = slots.map(slot =>
        getSlotInterventionDistrictCoverage(budgetsBySlotKey.get(slot.key)),
    );

    if (displayMode === 'overlay') {
        const countRowsBySlotKey = new Map(
            slots.map((slot, index) => [
                slot.key,
                coverageBySlotIndex[index].map(row => ({
                    interventionId: row.interventionId,
                    interventionLabel: row.interventionLabel,
                    value: row.districtCount,
                })),
            ]),
        );
        const countRows = mergeSlotRowsByIntervention(countRowsBySlotKey);

        const percentRowsBySlotKey = new Map(
            slots.map((slot, index) => [
                slot.key,
                coverageBySlotIndex[index].map(row => ({
                    interventionId: row.interventionId,
                    interventionLabel: row.interventionLabel,
                    value: totalDistrictCount
                        ? (row.districtCount / totalDistrictCount) * 100
                        : 0,
                })),
            ]),
        );
        const percentRows = mergeSlotRowsByIntervention(percentRowsBySlotKey);

        const renderCountTooltip = (row: (typeof countRows)[number]) => (
            <ChartTooltip
                title={row.interventionLabel}
                rows={slots.map(slot => {
                    const count = row.valueBySlotKey[slot.key] ?? 0;
                    const percent = percentOfTotal(count, totalDistrictCount);
                    return {
                        label: slot.label,
                        value: percent
                            ? `${count} (${percent})`
                            : String(count),
                        color: slot.color,
                    };
                })}
            />
        );

        return (
            <>
                <Typography variant="subtitle2" sx={styles.sectionTitle}>
                    {formatMessage(MESSAGES.comparisonDistrictsCoveredTitle)}
                </Typography>
                <Grid container spacing={1} sx={{ flex: 1, minHeight: 0 }}>
                    <Grid item xs={12} md={6} sx={{ height: '100%' }}>
                        <WidgetCard
                            title={formatMessage(
                                MESSAGES.comparisonDistrictsCountTitle,
                            )}
                            icon={PlaceOutlined}
                            isLoading={isBudgetLoading}
                            bodySx={styles.chartBody}
                        >
                            <OverlayGroupedBarChart
                                rows={countRows}
                                slots={slots}
                                valueFormatter={value =>
                                    String(Math.round(value))
                                }
                                emptyMessage={formatMessage(
                                    MESSAGES.noBudgetData,
                                )}
                                renderTooltip={renderCountTooltip}
                            />
                        </WidgetCard>
                    </Grid>
                    <Grid item xs={12} md={6} sx={{ height: '100%' }}>
                        <WidgetCard
                            title={formatMessage(
                                MESSAGES.comparisonDistrictsPercentTitle,
                            )}
                            icon={PlaceOutlined}
                            isLoading={isBudgetLoading}
                            bodySx={styles.chartBody}
                        >
                            <DistrictsRadarChart
                                rows={percentRows}
                                slots={slots}
                                emptyMessage={formatMessage(
                                    MESSAGES.noBudgetData,
                                )}
                                renderTooltip={row => (
                                    <ChartTooltip
                                        title={row.interventionLabel}
                                        rows={slots.map(slot => ({
                                            label: slot.label,
                                            value: `${formatPercentValue((row.valueBySlotKey[slot.key] ?? 0) / 100)}`,
                                            color: slot.color,
                                        }))}
                                    />
                                )}
                            />
                        </WidgetCard>
                    </Grid>
                </Grid>
            </>
        );
    }

    return (
        <>
            <Typography variant="subtitle2" sx={styles.sectionTitle}>
                {formatMessage(MESSAGES.comparisonDistrictsCoveredTitle)}
            </Typography>
            <Grid container spacing={1} sx={{ flex: 1, minHeight: 0 }}>
                {slots.map((slot, index) => {
                    const rows = coverageBySlotIndex[index];
                    const chartData = rows.map(row => ({
                        interventionLabel: row.interventionLabel,
                        districtCount: row.districtCount,
                    }));
                    const yAxisLabels = chartData.map(
                        row => row.interventionLabel,
                    );

                    return (
                        <Grid
                            item
                            xs={12}
                            md={12 / slots.length}
                            key={slot.key}
                            sx={{ height: '100%' }}
                        >
                            <WidgetCard
                                title={slot.label}
                                icon={PlaceOutlined}
                                iconSx={{ color: slot.color }}
                                isLoading={isBudgetLoading}
                                bodySx={styles.chartBody}
                            >
                                {chartData.length === 0 ? (
                                    <ChartEmptyState
                                        message={formatMessage(
                                            MESSAGES.noBudgetData,
                                        )}
                                    />
                                ) : (
                                    <DistrictsBarChart
                                        chartData={chartData}
                                        yAxisLabels={yAxisLabels}
                                        color={slot.color}
                                        totalDistrictCount={
                                            totalDistrictCount
                                        }
                                        gridProps={gridProps}
                                        axisProps={axisProps}
                                    />
                                )}
                            </WidgetCard>
                        </Grid>
                    );
                })}
            </Grid>
        </>
    );
};

type DistrictsBarChartProps = {
    chartData: { interventionLabel: string; districtCount: number }[];
    yAxisLabels: string[];
    color: string;
    totalDistrictCount?: number;
    gridProps: Record<string, unknown>;
    axisProps: Record<string, unknown>;
};

const DistrictsBarChart: FC<DistrictsBarChartProps> = ({
    chartData,
    yAxisLabels,
    color,
    totalDistrictCount,
    gridProps,
    axisProps,
}) => {
    const { width: yAxisWidth, formatTick } = useAutoYAxisWidth({
        labels: yAxisLabels,
        maxLabel: Y_AXIS_MAX_LABEL,
    });

    const renderTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) {
            return null;
        }
        const row = payload[0].payload;
        const percent = percentOfTotal(row.districtCount, totalDistrictCount);
        return (
            <ChartTooltip
                title={row.interventionLabel}
                rows={[
                    {
                        label: row.interventionLabel,
                        value: percent
                            ? `${row.districtCount} (${percent})`
                            : String(row.districtCount),
                        color,
                    },
                ]}
            />
        );
    };

    return (
        <Box sx={styles.chartCanvas}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    layout="vertical"
                    maxBarSize={BAR_SIZE}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                    <CartesianGrid horizontal={false} {...gridProps} />
                    <XAxis
                        type="number"
                        allowDecimals={false}
                        {...axisProps}
                        tickMargin={4}
                    />
                    <YAxis
                        type="category"
                        dataKey="interventionLabel"
                        width={yAxisWidth}
                        tickFormatter={formatTick}
                        {...axisProps}
                        tickMargin={AUTO_Y_AXIS_TICK_MARGIN}
                    />
                    <Tooltip cursor={false} content={renderTooltip} />
                    <Bar
                        dataKey="districtCount"
                        fill={color}
                        maxBarSize={BAR_SIZE}
                        isAnimationActive={false}
                        radius={[0, 4, 4, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
};
