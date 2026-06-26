import React, { FC, useMemo } from 'react';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import { Box } from '@mui/material';
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
import { ChartEmptyState } from '../../../../components/charts/ChartEmptyState';
import { useChartTheme } from '../../../../components/charts/chartTheme';
import { ChartTooltip } from '../../../../components/charts/ChartTooltip';
import { useAutoYAxisWidth } from '../../../../components/useAutoYAxisWidth';
import { WidgetCard } from '../../../../components/WidgetCard';
import { MESSAGES } from '../../../messages';
import { formatBigNumber } from '../../../planning/libs/cost-utils';
import { useComparisonDataContext } from '../../ComparisonDataContext';
import {
    CostPerAvertedCaseDatum,
    buildCostPerAvertedCaseChartData,
} from '../../utils/chartData';
import { computeNiceTicks } from '../../utils/chartUtils';
import { SCENARIO_BASE_COLORS } from '../../utils/colors';

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
    const { axisColor, gridProps, axisProps } = useChartTheme();
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

    // Size the (category) scenario-name axis to its widest label so it only
    // takes the space it needs.
    const yAxisLabels = useMemo(() => chartData.map(d => d.name), [chartData]);
    const { width: yAxisWidth } = useAutoYAxisWidth({ labels: yAxisLabels });

    const emptyMessage = useMemo(() => {
        if (!hasComparison) {
            return formatMessage(MESSAGES.costPerAvertedCaseSelectComparison);
        }
        if (hasInsufficientAverted) {
            return formatMessage(MESSAGES.costPerAvertedCaseNoCasesAverted);
        }
        return formatMessage(MESSAGES.noBudgetData);
    }, [hasComparison, hasInsufficientAverted, formatMessage]);

    return (
        <WidgetCard
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
                            <CartesianGrid horizontal={false} {...gridProps} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                {...axisProps}
                                width={yAxisWidth}
                            />
                            <XAxis
                                type="number"
                                tickFormatter={(v: number) =>
                                    v === 0
                                        ? formatMessage(MESSAGES.baselineLabel)
                                        : formatCostValue(v)
                                }
                                {...axisProps}
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
        </WidgetCard>
    );
};
