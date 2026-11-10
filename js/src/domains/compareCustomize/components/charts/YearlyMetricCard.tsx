import React, { FC, useMemo } from 'react';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import { Box, useTheme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    CartesianGrid,
    ErrorBar,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { SxStyles } from 'Iaso/types/general';
import { ChartEmptyState } from '../../../../components/charts/ChartEmptyState';
import { useChartTheme } from '../../../../components/charts/chartTheme';
import { ChartTooltip } from '../../../../components/charts/ChartTooltip';
import { useAutoYAxisWidth } from '../../../../components/useAutoYAxisWidth';
import { WidgetCard } from '../../../../components/WidgetCard';
import { MESSAGES } from '../../../messages';
import { useComparisonDataContext } from '../../ComparisonDataContext';
import { useMetricSelection } from '../../hooks/useMetricSelection';
import { MetricKey } from '../../types';
import {
    buildYearlyMetricChartData,
    getYearlyMetricMaxValue,
} from '../../utils/chartData';
import {
    useMetricConfig,
    useMetricValueFormatter,
} from '../../utils/metricConfig';

const styles = {
    chartBody: {
        width: '100%',
        height: 220,
    },
} satisfies SxStyles;

type YearlyMetricTooltipProps = {
    active?: boolean;
    label?: number;
    payload?: { name: string; value: number; color: string }[];
    formatValue: (value: number) => string;
};

const YearlyMetricTooltip: FC<YearlyMetricTooltipProps> = ({
    active,
    label,
    payload,
    formatValue,
}) => {
    if (!active || !payload?.length) return null;
    return (
        <ChartTooltip
            title={label}
            rows={payload.map(entry => ({
                label: entry.name,
                value: formatValue(entry.value),
                color: entry.color,
            }))}
        />
    );
};

export const YearlyMetricCard: FC = () => {
    const {
        scenarios,
        impactsByScenarioId,
        budgetsByScenarioId,
        isImpactLoading,
        isBudgetLoading,
    } = useComparisonDataContext();
    const { formatMessage } = useSafeIntl();
    const theme = useTheme();
    const { gridProps, axisProps } = useChartTheme();
    const config = useMetricConfig();
    const { selectedMetric, setSelectedMetric, metricOptions } =
        useMetricSelection(MetricKey.PrevalenceRate);
    const formatValue = useMetricValueFormatter(selectedMetric);

    const isCostMetric = selectedMetric === MetricKey.OrgUnitTotalCost;
    const isLoading = isImpactLoading || (isCostMetric && isBudgetLoading);

    const chartData = useMemo(
        () =>
            buildYearlyMetricChartData(
                scenarios,
                selectedMetric,
                impactsByScenarioId,
                budgetsByScenarioId,
            ),
        [scenarios, selectedMetric, impactsByScenarioId, budgetsByScenarioId],
    );

    const hasData = chartData.length > 0;

    const yAxisLabels = useMemo(
        () => [
            formatValue(
                getYearlyMetricMaxValue(
                    chartData,
                    scenarios.map(scenario => scenario.label),
                ),
            ),
        ],
        [chartData, scenarios, formatValue],
    );
    const { width: yAxisWidth } = useAutoYAxisWidth({ labels: yAxisLabels });

    return (
        <WidgetCard
            title={formatMessage(MESSAGES.yearlyMetricTitle, {
                metric: config[selectedMetric].label,
            })}
            icon={ShowChartOutlinedIcon}
            bodySx={{ minHeight: 220 }}
            dropdown={{
                value: selectedMetric,
                options: metricOptions,
                onChange: setSelectedMetric,
            }}
            isLoading={isLoading}
        >
            {!hasData ? (
                <ChartEmptyState
                    message={formatMessage(
                        isCostMetric
                            ? MESSAGES.noBudgetData
                            : MESSAGES.noImpactData,
                    )}
                />
            ) : (
                <Box sx={styles.chartBody}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{
                                top: 5,
                                right: 5,
                                left: 0,
                                bottom: -5,
                            }}
                        >
                            <CartesianGrid vertical={false} {...gridProps} />
                            <XAxis
                                dataKey="year"
                                {...axisProps}
                                tickMargin={4}
                            />
                            <YAxis
                                tickFormatter={formatValue}
                                {...axisProps}
                                width={yAxisWidth}
                                tickMargin={2}
                            />
                            <Tooltip
                                content={
                                    <YearlyMetricTooltip
                                        formatValue={formatValue}
                                    />
                                }
                            />
                            {scenarios.map(scenario => (
                                <Line
                                    key={scenario.id}
                                    type="monotone"
                                    dataKey={scenario.label}
                                    stroke={scenario.color}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    connectNulls
                                >
                                    <ErrorBar
                                        dataKey={`${scenario.label}_ci`}
                                        width={4}
                                        strokeWidth={1.5}
                                        stroke={theme.palette.text.disabled}
                                    />
                                </Line>
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </WidgetCard>
    );
};
