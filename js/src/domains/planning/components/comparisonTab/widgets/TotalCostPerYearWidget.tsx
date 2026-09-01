import React, { FC, useCallback, useMemo } from 'react';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import { Box } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { SxStyles } from 'Iaso/types/general';
import { ChartEmptyState } from '../../../../../components/charts/ChartEmptyState';
import { useChartTheme } from '../../../../../components/charts/chartTheme';
import {
    ChartTooltip,
    ChartTooltipRow,
} from '../../../../../components/charts/ChartTooltip';
import { useAutoYAxisWidth } from '../../../../../components/useAutoYAxisWidth';
import { WidgetCard } from '../../../../../components/WidgetCard';
import { MESSAGES } from '../../../../messages';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import { mergeSlotYearlyCostsByYear } from '../../../libs/comparison-aggregation';
import { formatBigNumber } from '../../../libs/cost-utils';

const styles = {
    cardBody: {
        display: 'flex',
        flexDirection: 'column',
    },
    chartBody: {
        width: '100%',
        flex: 1,
        minHeight: 0,
    },
} satisfies SxStyles;

export const TotalCostPerYearWidget: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { gridProps, axisProps } = useChartTheme();
    const { slots, totalCostsBySlotKey, isBudgetLoading, currency } =
        useScenarioComparisonContext();

    const chartData = useMemo(
        () => mergeSlotYearlyCostsByYear(totalCostsBySlotKey),
        [totalCostsBySlotKey],
    );

    const formatCost = useCallback(
        (value: number) => formatBigNumber(value, currency) ?? '0',
        [currency],
    );

    const yAxisLabels = useMemo(() => {
        const maxCost = Math.max(
            0,
            ...chartData.flatMap(row => slots.map(slot => row[slot.key] ?? 0)),
        );
        return [formatCost(maxCost)];
    }, [chartData, slots, formatCost]);
    const { width: yAxisWidth } = useAutoYAxisWidth({ labels: yAxisLabels });

    const renderTooltip = useCallback(
        ({ active, label, payload }: any) => {
            if (!active || !payload?.length) {
                return null;
            }
            const rows = slots.flatMap<ChartTooltipRow>(slot => {
                const entry = payload.find((p: any) => p.dataKey === slot.key);
                return entry?.value != null
                    ? [
                          {
                              label: slot.label,
                              value: formatCost(entry.value),
                              color: slot.color,
                          },
                      ]
                    : [];
            });
            return <ChartTooltip title={String(label)} rows={rows} />;
        },
        [slots, formatCost],
    );

    return (
        <WidgetCard
            title={formatMessage(MESSAGES.comparisonTotalCostPerYearTitle)}
            icon={ShowChartOutlinedIcon}
            isLoading={isBudgetLoading}
            bodySx={styles.cardBody}
        >
            {chartData.length === 0 ? (
                <ChartEmptyState
                    message={formatMessage(MESSAGES.noBudgetData)}
                />
            ) : (
                <Box sx={styles.chartBody}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid vertical={false} {...gridProps} />
                            <XAxis
                                dataKey="year"
                                interval={0}
                                {...axisProps}
                                tickMargin={8}
                            />
                            <YAxis
                                type="number"
                                width={yAxisWidth}
                                tickFormatter={formatCost}
                                {...axisProps}
                                tickMargin={4}
                            />
                            <Tooltip cursor={false} content={renderTooltip} />
                            {slots.map(slot => (
                                <Line
                                    key={slot.key}
                                    type="monotone"
                                    dataKey={slot.key}
                                    name={slot.label}
                                    stroke={slot.color}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                    isAnimationActive={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </WidgetCard>
    );
};
