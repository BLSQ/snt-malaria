import React, { FC, useCallback, useMemo } from 'react';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import { Box, Stack, Typography } from '@mui/material';
import { green, red } from '@mui/material/colors';
import { useSafeIntl } from 'bluesquare-components';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { SxStyles } from 'Iaso/types/general';
import { ChartEmptyState } from '../../../../../components/charts/ChartEmptyState';
import { useChartTheme } from '../../../../../components/charts/chartTheme';
import { ChartTooltip } from '../../../../../components/charts/ChartTooltip';
import { useAutoYAxisWidth } from '../../../../../components/useAutoYAxisWidth';
import { WidgetCard } from '../../../../../components/WidgetCard';
import { MESSAGES } from '../../../../messages';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import {
    getSlotInterventionCosts,
    mergeInterventionCostDeltas,
} from '../../../libs/comparison-aggregation';
import { formatBigNumber } from '../../../libs/cost-utils';

const DECREASE_COLOR = green[400];
const INCREASE_COLOR = red[400];
const Y_AXIS_MAX_LABEL = 'A fairly long intervention';

const styles = {
    cardBody: {
        display: 'flex',
        flexDirection: 'column',
    },
    legend: {
        alignItems: 'center',
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: '50%',
    },
    panels: {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        gap: 2,
    },
    panel: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
    },
    panelCaption: {
        mb: 0.5,
    },
    chartBody: {
        flex: 1,
        minHeight: 0,
    },
} satisfies SxStyles;

type PanelRow = {
    interventionId: number;
    interventionLabel: string;
    delta: number;
};

// Line from the zero axis to the delta, with a dot at the end -- the pasted
// reference chart's lollipop look, which recharts can't draw natively.
const LollipopBar: FC = (props: any) => {
    const { x, y, width, height, fill, payload } = props;
    const cy = y + height / 2;
    const positive = (payload?.delta ?? 0) >= 0;
    const zeroX = positive ? x : x + width;
    const endX = positive ? x + width : x;
    return (
        <g>
            <line
                x1={zeroX}
                y1={cy}
                x2={endX}
                y2={cy}
                stroke={fill}
                strokeWidth={3}
            />
            <circle cx={endX} cy={cy} r={4.5} fill={fill} />
        </g>
    );
};

export const CostDifferenceWidget: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { axisColor, gridProps, axisProps } = useChartTheme();
    const { slots, budgetsBySlotKey, isBudgetLoading, currency, orgUnitIds } =
        useScenarioComparisonContext();

    const baseSlot = slots[0];
    const comparedSlots = useMemo(() => slots.slice(1), [slots]);

    const rows = useMemo(() => {
        const baseCosts = getSlotInterventionCosts(
            budgetsBySlotKey.get(baseSlot?.key ?? ''),
            orgUnitIds,
        );
        const comparedCostsBySlotKey = new Map(
            comparedSlots.map(slot => [
                slot.key,
                getSlotInterventionCosts(
                    budgetsBySlotKey.get(slot.key),
                    orgUnitIds,
                ),
            ]),
        );
        return mergeInterventionCostDeltas(baseCosts, comparedCostsBySlotKey);
    }, [baseSlot, comparedSlots, budgetsBySlotKey, orgUnitIds]);

    const formatCost = useCallback(
        (value: number) => formatBigNumber(value, currency) ?? '0',
        [currency],
    );

    const { width: yAxisWidth, formatTick } = useAutoYAxisWidth({
        labels: rows.map(row => row.interventionLabel),
        maxLabel: Y_AXIS_MAX_LABEL,
    });

    const renderTooltip = useCallback(
        ({ active, payload }: any) => {
            if (!active || !payload?.length) {
                return null;
            }
            const { interventionLabel, delta } = payload[0].payload as PanelRow;
            return (
                <ChartTooltip
                    title={interventionLabel}
                    rows={[
                        {
                            label: formatMessage(MESSAGES.comparisonCostChange),
                            value: `${delta > 0 ? '+' : ''}${formatCost(delta)}`,
                            color: delta > 0 ? INCREASE_COLOR : DECREASE_COLOR,
                        },
                    ]}
                />
            );
        },
        [formatCost, formatMessage],
    );

    const legend = (
        <Stack direction="row" spacing={1.5} sx={styles.legend}>
            <Box sx={styles.legendItem}>
                <Box
                    sx={[styles.legendDot, { backgroundColor: DECREASE_COLOR }]}
                />
                <Typography variant="caption">
                    {formatMessage(MESSAGES.comparisonCostDecrease)}
                </Typography>
            </Box>
            <Box sx={styles.legendItem}>
                <Box
                    sx={[styles.legendDot, { backgroundColor: INCREASE_COLOR }]}
                />
                <Typography variant="caption">
                    {formatMessage(MESSAGES.comparisonCostIncrease)}
                </Typography>
            </Box>
        </Stack>
    );

    const hasData = comparedSlots.length > 0 && rows.length > 0;

    return (
        <WidgetCard
            title={formatMessage(MESSAGES.comparisonCostDifferenceTitle)}
            icon={CompareArrowsOutlinedIcon}
            isLoading={isBudgetLoading}
            actions={hasData ? legend : undefined}
            bodySx={styles.cardBody}
        >
            {!hasData ? (
                <ChartEmptyState
                    message={formatMessage(
                        MESSAGES.comparisonCostDifferenceEmpty,
                    )}
                />
            ) : (
                <Box sx={styles.panels}>
                    {comparedSlots.map(comparedSlot => {
                        const panelData: PanelRow[] = rows.map(row => ({
                            interventionId: row.interventionId,
                            interventionLabel: row.interventionLabel,
                            delta: row.deltaBySlotKey[comparedSlot.key] ?? 0,
                        }));
                        return (
                            <Box key={comparedSlot.key} sx={styles.panel}>
                                <Typography
                                    variant="caption"
                                    color="textSecondary"
                                    sx={styles.panelCaption}
                                >
                                    {`${comparedSlot.label} ${formatMessage(
                                        MESSAGES.comparisonVersusLabel,
                                    )} ${baseSlot?.label ?? ''}`}
                                </Typography>
                                <Box sx={styles.chartBody}>
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            layout="vertical"
                                            data={panelData}
                                            margin={{
                                                top: 4,
                                                right: 16,
                                                left: 0,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid
                                                horizontal={false}
                                                {...gridProps}
                                            />
                                            <XAxis
                                                type="number"
                                                tickFormatter={formatCost}
                                                {...axisProps}
                                                tickMargin={4}
                                            />
                                            <YAxis
                                                type="category"
                                                dataKey="interventionLabel"
                                                width={yAxisWidth}
                                                interval={0}
                                                tickFormatter={formatTick}
                                                {...axisProps}
                                                tickMargin={4}
                                            />
                                            <ReferenceLine
                                                x={0}
                                                stroke={axisColor}
                                                strokeDasharray="4 4"
                                            />
                                            <Tooltip
                                                cursor={false}
                                                content={renderTooltip}
                                            />
                                            <Bar
                                                dataKey="delta"
                                                shape={<LollipopBar />}
                                                isAnimationActive={false}
                                            >
                                                {panelData.map(row => (
                                                    <Cell
                                                        key={row.interventionId}
                                                        fill={
                                                            row.delta > 0
                                                                ? INCREASE_COLOR
                                                                : DECREASE_COLOR
                                                        }
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}
        </WidgetCard>
    );
};
