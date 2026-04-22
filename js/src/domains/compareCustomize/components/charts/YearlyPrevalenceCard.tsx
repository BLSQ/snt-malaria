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
import { MESSAGES } from '../../../messages';
import { formatPercentValue } from '../../../planning/libs/cost-utils';
import { useComparisonDataContext } from '../../ComparisonDataContext';
import { buildPrevalenceChartData } from '../../utils/chartData';
import { Card } from '../Card';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartTooltip } from './ChartTooltip';

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
    const axisColor = theme.palette.text.secondary;

    const chartData = useMemo(
        () => buildPrevalenceChartData(scenarios, impactsByScenarioId),
        [scenarios, impactsByScenarioId],
    );

    const hasData = chartData.length > 0;

    return (
        <Card
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
                            <CartesianGrid
                                vertical={false}
                                strokeDasharray=""
                                stroke={theme.palette.divider}
                            />
                            <XAxis
                                dataKey="year"
                                tick={{ fill: axisColor, fontSize: '0.75rem' }}
                                stroke={axisColor}
                                tickMargin={4}
                            />
                            <YAxis
                                tickFormatter={formatPercentValue}
                                tick={{ fill: axisColor, fontSize: '0.75rem' }}
                                stroke={axisColor}
                                width={50}
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
        </Card>
    );
};
