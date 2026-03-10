import React, { FC, useMemo } from 'react';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import { Box, useTheme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ErrorBar,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { ScenarioImpactMetrics, ScenarioDisplay } from '../../types';
import { Card } from '../Card';
import { ChartEmptyState } from './ChartEmptyState';

type Props = {
    scenarios: ScenarioDisplay[];
    impactsByScenarioId: Map<number, ScenarioImpactMetrics | undefined>;
    isLoading: boolean;
};

const formatCostValue = (value: number): string =>
    new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);

type ChartDatum = {
    name: string;
    value: number;
    error?: [number, number];
    color: string;
};

const styles = {
    chartBody: {
        width: '100%',
        height: 220,
    },
} satisfies SxStyles;

export const CostPerAvertedCaseCard: FC<Props> = ({
    scenarios,
    impactsByScenarioId,
    isLoading,
}) => {
    const { formatMessage } = useSafeIntl();
    const theme = useTheme();
    const axisColor = theme.palette.text.secondary;

    const chartData: ChartDatum[] = useMemo(
        () =>
            scenarios
                .map((scenario): ChartDatum | null => {
                    const impact = impactsByScenarioId.get(scenario.id);
                    const metric = impact?.cost_per_averted_case;
                    const costValue = metric?.value;

                    if (!costValue || costValue < 0) {
                        return null;
                    }

                    const datum: ChartDatum = {
                        name: scenario.label,
                        value: costValue,
                        color: scenario.color,
                    };

                    if (metric.lower != null && metric.upper != null) {
                        datum.error = [
                            costValue - metric.lower,
                            metric.upper - costValue,
                        ];
                    }

                    return datum;
                })
                .filter((d): d is ChartDatum => d !== null),
        [scenarios, impactsByScenarioId],
    );

    return (
        <Card
            title={formatMessage(MESSAGES.costPerAvertedCaseTitle)}
            icon={BarChartOutlinedIcon}
            bodySx={{ minHeight: 220 }}
            isLoading={isLoading}
        >
            {chartData.length === 0 ? (
                <ChartEmptyState message={formatMessage(MESSAGES.noImpactData)} />
            ) : (
                <Box sx={styles.chartBody}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{
                                top: 5,
                                right: 5,
                                left: 0,
                                bottom: -5,
                            }}
                        >
                            <CartesianGrid vertical={false} strokeDasharray="" stroke={theme.palette.divider} />
                            <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: '0.75rem' }} stroke={axisColor} tickMargin={4} />
                            <YAxis
                                tickFormatter={(v: number) =>
                                    formatCostValue(v)
                                }
                                tick={{ fill: axisColor, fontSize: '0.75rem' }}
                                stroke={axisColor}
                                width={50}
                                tickMargin={2}
                                allowDecimals
                            />
                            <Tooltip
                                formatter={formatCostValue}
                                cursor={false}
                            />
                            <Bar dataKey="value" maxBarSize={64} radius={[4, 4, 0, 0]}>
                                <ErrorBar
                                    dataKey="error"
                                    width={6}
                                    strokeWidth={1.5}
                                    stroke={theme.palette.text.disabled}
                                />
                                {chartData.map(entry => (
                                    <Cell
                                        key={entry.name}
                                        fill={entry.color}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </Card>
    );
};
