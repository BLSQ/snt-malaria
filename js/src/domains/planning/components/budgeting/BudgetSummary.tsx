import React, { FC, useMemo } from 'react';
import { AccountBalanceOutlined } from '@mui/icons-material';
import { Box, Typography, useTheme } from '@mui/material';
import { blueGrey, red } from '@mui/material/colors';
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
import { useChartTheme } from '../../../../components/charts/chartTheme';
import {
    ChartTooltip,
    ChartTooltipRow,
} from '../../../../components/charts/ChartTooltip';
import { useAutoYAxisWidth } from '../../../../components/useAutoYAxisWidth';
import { WidgetCard } from '../../../../components/WidgetCard';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { useGetBudgetByGrant } from '../../hooks/useGetBudgetByGrant';
import { formatBigNumber } from '../../libs/cost-utils';
import { BudgetBarShape, BudgetChartDatum } from './BudgetBarShape';

const styles = {
    chartBody: {
        width: '100%',
        flex: 1,
        minHeight: 0,
    },
} satisfies SxStyles;

export const BudgetSummary: FC = () => {
    const { formatMessage } = useSafeIntl();
    const theme = useTheme();
    const { gridProps, axisProps } = useChartTheme();
    const { scenarioId } = usePlanningContext();
    const { data, isLoading } = useGetBudgetByGrant(scenarioId);

    const withinColor = blueGrey[200]; // #B0BEC5
    const excessColor = red[500]; // #F44336
    const targetColor = theme.palette.primary.main;

    const chartData: BudgetChartDatum[] = useMemo(
        () =>
            (data?.grant_costs ?? []).map(item => ({
                name:
                    item.short_name ||
                    item.name ||
                    formatMessage(MESSAGES.unspecifiedGrant),
                cost: item.total_cost,
                amount: item.amount,
            })),
        [data, formatMessage],
    );

    const totalCost = useMemo(
        () => chartData.reduce((sum, d) => sum + d.cost, 0),
        [chartData],
    );

    // Make room for grant amounts that exceed their cost so the dashed target
    // outline never clips above the plot area.
    const yMax = useMemo(() => {
        const values = chartData.flatMap(d => [d.cost, d.amount ?? 0]);
        const max = values.length > 0 ? Math.max(...values) : 0;
        return max > 0 ? max * 1.1 : 0;
    }, [chartData]);

    // Size the (numeric) value axis to its widest formatted tick (e.g. the top
    // "100.00M"), which the domain max produces, so labels aren't clipped.
    const yAxisLabels = useMemo(
        () => (chartData.length > 0 ? [formatBigNumber(yMax)] : []),
        [chartData, yMax],
    );
    const { width: yAxisWidth } = useAutoYAxisWidth({ labels: yAxisLabels });

    const renderTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) {
            return null;
        }
        const datum: BudgetChartDatum = payload[0].payload;
        const rows: ChartTooltipRow[] = [
            {
                label: formatMessage(MESSAGES.summaryTotalCostTitle),
                value: formatBigNumber(datum.cost),
            },
        ];
        if (datum.amount != null) {
            rows.push({
                label: formatMessage(MESSAGES.grantEnvelope),
                value: formatBigNumber(datum.amount),
            });
        }
        return <ChartTooltip title={datum.name} rows={rows} />;
    };

    return (
        <WidgetCard
            title={formatMessage(MESSAGES.summaryTotalCostTitle)}
            icon={AccountBalanceOutlined}
            isLoading={isLoading}
            bodySx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
            {!isLoading && chartData.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                    {formatMessage(MESSAGES.noBudgetData)}
                </Typography>
            ) : (
                <>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {Math.round(totalCost).toLocaleString()}
                    </Typography>
                    <Box sx={styles.chartBody}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{
                                    top: 8,
                                    right: 8,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <CartesianGrid
                                    vertical={false}
                                    {...gridProps}
                                />
                                <XAxis
                                    dataKey="name"
                                    interval={0}
                                    {...axisProps}
                                    tickMargin={4}
                                />
                                <YAxis
                                    domain={[0, yMax]}
                                    tickFormatter={value =>
                                        formatBigNumber(value as number)
                                    }
                                    {...axisProps}
                                    width={yAxisWidth}
                                    tickMargin={2}
                                />
                                <Tooltip
                                    cursor={false}
                                    content={renderTooltip}
                                />
                                <Bar
                                    dataKey="cost"
                                    maxBarSize={56}
                                    isAnimationActive={false}
                                    shape={
                                        <BudgetBarShape
                                            withinColor={withinColor}
                                            excessColor={excessColor}
                                            targetColor={targetColor}
                                        />
                                    }
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </>
            )}
        </WidgetCard>
    );
};
