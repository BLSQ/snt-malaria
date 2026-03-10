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
import { ScenarioImpactMetrics, ScenarioDisplay } from '../../types';
import { formatPercentValue } from '../../../planning/libs/cost-utils';
import { Card } from '../Card';
import { ChartEmptyState } from './ChartEmptyState';

type Props = {
    scenarios: ScenarioDisplay[];
    impactsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>;
    isLoading: boolean;
};

type ChartDataPoint = {
    year: number;
    [key: string]: number | [number, number] | undefined;
};

const styles = {
    chartBody: {
        width: '100%',
        height: 220,
    },
} satisfies SxStyles;

export const YearlyPrevalenceCard: FC<Props> = ({
    scenarios,
    impactsByScenarioId,
    isLoading,
}) => {
    const { formatMessage } = useSafeIntl();
    const theme = useTheme();
    const axisColor = theme.palette.text.secondary;

    const chartData: ChartDataPoint[] = useMemo(() => {
        const yearSet = new Set<number>();
        scenarios.forEach(scenario => {
            const impact = impactsByScenarioId.get(scenario.id);
            impact?.by_year?.forEach(yr => yearSet.add(yr.year));
        });

        const years = Array.from(yearSet).sort((a, b) => a - b);
        if (years.length === 0) return [];

        return years.map(year => {
            const point: ChartDataPoint = { year };
            scenarios.forEach(scenario => {
                const impact = impactsByScenarioId.get(scenario.id);
                const yearData = impact?.by_year?.find(
                    yr => yr.year === year,
                );
                const metric = yearData?.prevalence_rate;
                point[scenario.label] = metric?.value ?? undefined;

                if (
                    metric?.value != null &&
                    metric?.lower != null &&
                    metric?.upper != null
                ) {
                    point[`${scenario.label}_ci`] = [
                        metric.value - metric.lower,
                        metric.upper - metric.value,
                    ];
                }
            });
            return point;
        });
    }, [scenarios, impactsByScenarioId]);

    const hasData = chartData.length > 0;

    return (
        <Card
            title={formatMessage(MESSAGES.yearlyPrevalenceTitle)}
            icon={ShowChartOutlinedIcon}
            bodySx={{ minHeight: 220 }}
            isLoading={isLoading}
        >
            {!hasData ? (
                <ChartEmptyState message={formatMessage(MESSAGES.noImpactData)} />
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
                            <CartesianGrid vertical={false} strokeDasharray="" stroke={theme.palette.divider} />
                            <XAxis dataKey="year" tick={{ fill: axisColor, fontSize: '0.75rem' }} stroke={axisColor} tickMargin={4} />
                            <YAxis
                                tickFormatter={(value: number) =>
                                    formatPercentValue(value)
                                }
                                tick={{ fill: axisColor, fontSize: '0.75rem' }}
                                stroke={axisColor}
                                width={50}
                                tickMargin={2}
                            />
                            <Tooltip
                                formatter={(value: number) =>
                                    formatPercentValue(value)
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
        </Card>
    );
};
