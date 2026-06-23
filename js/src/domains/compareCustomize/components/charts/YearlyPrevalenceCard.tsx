import React, { FC, useMemo } from 'react';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import { Box, useTheme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
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
import { ChartEmptyState } from '../../../../components/charts/ChartEmptyState';
import { useChartTheme } from '../../../../components/charts/chartTheme';
import { ChartTooltip } from '../../../../components/charts/ChartTooltip';
import { useAutoYAxisWidth } from '../../../../components/useAutoYAxisWidth';
import { WidgetCard } from '../../../../components/WidgetCard';
import { MESSAGES } from '../../../messages';
import { formatPercentValue } from '../../../planning/libs/cost-utils';
import { useComparisonDataContext } from '../../ComparisonDataContext';
import {
    buildPrevalenceChartData,
    getPrevalenceMaxValue,
} from '../../utils/chartData';

const styles = {
    chartBody: {
        width: '100%',
        height: 220,
    },
} satisfies SxStyles;

type PrevalenceTooltipProps = {
    active?: boolean;
    label?: number;
    payload?: { name: string; value: number; color: string }[];
};

const PrevalenceTooltip: FC<PrevalenceTooltipProps> = ({
    active,
    label,
    payload,
}) => {
    if (!active || !payload?.length) return null;
    return (
        <ChartTooltip
            title={label}
            rows={payload.map(entry => ({
                label: entry.name,
                value: formatPercentValue(entry.value),
                color: entry.color,
            }))}
        />
    );
};

export const YearlyPrevalenceCard: FC = () => {
    const {
        scenarios,
        impactsByScenarioId,
        isImpactLoading: isLoading,
    } = useComparisonDataContext();
    const { formatMessage } = useSafeIntl();
    const theme = useTheme();
    const { gridProps, axisProps } = useChartTheme();

    const chartData = useMemo(
        () => buildPrevalenceChartData(scenarios, impactsByScenarioId),
        [scenarios, impactsByScenarioId],
    );

    const hasData = chartData.length > 0;

    // Size the (numeric) value axis to its widest formatted tick so the percent
    // labels aren't clipped and the axis only takes the space it needs.
    const yAxisLabels = useMemo(
        () => [
            formatPercentValue(
                getPrevalenceMaxValue(
                    chartData,
                    scenarios.map(scenario => scenario.label),
                ),
            ),
        ],
        [chartData, scenarios],
    );
    const { width: yAxisWidth } = useAutoYAxisWidth({ labels: yAxisLabels });

    return (
        <WidgetCard
            title={formatMessage(MESSAGES.yearlyPrevalenceTitle)}
            icon={ShowChartOutlinedIcon}
            bodySx={{ minHeight: 220 }}
            isLoading={isLoading}
        >
            {!hasData ? (
                <ChartEmptyState
                    message={formatMessage(MESSAGES.noImpactData)}
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
                                tickFormatter={formatPercentValue}
                                {...axisProps}
                                width={yAxisWidth}
                                tickMargin={2}
                            />
                            <Tooltip content={<PrevalenceTooltip />} />
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
