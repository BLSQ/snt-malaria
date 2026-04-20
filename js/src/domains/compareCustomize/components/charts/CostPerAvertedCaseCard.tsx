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
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { formatBigNumber } from '../../../planning/libs/cost-utils';
import { useComparisonDataContext } from '../../ComparisonDataContext';
import {
    CostPerAvertedCaseDatum,
    buildCostPerAvertedCaseChartData,
} from '../../utils/chartData';
import { computeNiceTicks } from '../../utils/chartUtils';
import { SCENARIO_BASE_COLORS } from '../../utils/colors';
import { Card } from '../Card';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartTooltip } from './ChartTooltip';

const formatCostValue = (value: number): string =>
    new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);

const styles = {
    chartBody: {
        width: '100%',
        height: 220,
    },
} satisfies SxStyles;

type CostTooltipProps = {
    active?: boolean;
    payload?: { payload: CostPerAvertedCaseDatum }[];
    labels: {
        costPerAverted: string;
        relativeCost: string;
        avertedCases: string;
    };
};

const CostTooltip: FC<CostTooltipProps> = ({ active, payload, labels }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <ChartTooltip
            title={d.name}
            rows={[
                {
                    label: labels.costPerAverted,
                    value: formatCostValue(d.value),
                },
                {
                    label: labels.relativeCost,
                    value: formatBigNumber(d.relativeCost),
                },
                {
                    label: labels.avertedCases,
                    value: formatBigNumber(d.avertedCases),
                },
            ]}
        />
    );
};

export const CostPerAvertedCaseCard: FC = () => {
    const {
        scenarios,
        baselineScenarioId,
        impactsByScenarioId,
        budgetsByScenarioId,
        isImpactLoading,
        isBudgetLoading,
    } = useComparisonDataContext();
    const { formatMessage } = useSafeIntl();
    const theme = useTheme();
    const axisColor = theme.palette.text.secondary;
    const isLoading = isImpactLoading || isBudgetLoading;
    const hasComparison = scenarios.length >= 2;

    const { data: chartData, hasInsufficientAverted } = useMemo(
        () =>
            buildCostPerAvertedCaseChartData(
                scenarios,
                impactsByScenarioId,
                budgetsByScenarioId,
                baselineScenarioId,
            ),
        [
            scenarios,
            impactsByScenarioId,
            budgetsByScenarioId,
            baselineScenarioId,
        ],
    );

    const { domain, ticks } = useMemo(
        () => computeNiceTicks(chartData),
        [chartData],
    );

    const emptyMessage = useMemo(() => {
        if (!hasComparison) {
            return formatMessage(
                MESSAGES.costPerAvertedCaseSelectComparison,
            );
        }
        if (hasInsufficientAverted) {
            return formatMessage(
                MESSAGES.costPerAvertedCaseNoCasesAverted,
            );
        }
        return formatMessage(MESSAGES.noBudgetData);
    }, [hasComparison, hasInsufficientAverted, formatMessage]);

    return (
        <Card
            title={formatMessage(MESSAGES.costPerAvertedCaseTitle)}
            tooltip={formatMessage(MESSAGES.costPerAvertedCaseTooltip)}
            icon={BarChartOutlinedIcon}
            bodySx={{ minHeight: 220 }}
            isLoading={isLoading}
        >
            {chartData.length === 0 ? (
                <ChartEmptyState message={emptyMessage} />
            ) : (
                <Box sx={styles.chartBody}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={chartData}
                            margin={{
                                top: 5,
                                right: 20,
                                left: 5,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid
                                horizontal={false}
                                strokeDasharray=""
                                stroke={theme.palette.divider}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fill: axisColor, fontSize: '0.75rem' }}
                                stroke={axisColor}
                                width={80}
                            />
                            <XAxis
                                type="number"
                                tickFormatter={(v: number) =>
                                    v === 0
                                        ? formatMessage(MESSAGES.baselineLabel)
                                        : formatCostValue(v)
                                }
                                tick={{ fill: axisColor, fontSize: '0.75rem' }}
                                stroke={axisColor}
                                tickMargin={2}
                                domain={domain}
                                ticks={ticks}
                            />
                            <Tooltip
                                cursor={false}
                                content={
                                    <CostTooltip
                                        labels={{
                                            costPerAverted: formatMessage(
                                                MESSAGES.costPerAvertedCaseLabel,
                                            ),
                                            relativeCost: formatMessage(
                                                MESSAGES.relativeCostLabel,
                                            ),
                                            avertedCases: formatMessage(
                                                MESSAGES.avertedCasesLabel,
                                            ),
                                        }}
                                    />
                                }
                            />
                            <Bar
                                dataKey="value"
                                maxBarSize={64}
                                radius={[0, 4, 4, 0]}
                            >
                                <ErrorBar
                                    dataKey="errorBounds"
                                    width={8}
                                    strokeWidth={1.5}
                                    stroke={axisColor}
                                />
                                {chartData.map(entry => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Bar>
                            <ReferenceLine
                                x={0}
                                stroke={SCENARIO_BASE_COLORS[0]}
                                strokeWidth={3}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </Card>
    );
};
