import React, { FC, useMemo } from 'react';
import { AccountBalanceOutlined } from '@mui/icons-material';
import { Box, Typography, useTheme } from '@mui/material';
import { blueGrey, red } from '@mui/material/colors';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useChartTheme } from '../../../../components/charts/chartTheme';
import {
    ChartTooltip,
    ChartTooltipRow,
} from '../../../../components/charts/ChartTooltip';
import { WidgetCard } from '../../../../components/WidgetCard';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { useGetBudgetByGrant } from '../../hooks/useGetBudgetByGrant';
import { formatBigNumber } from '../../libs/cost-utils';

const BAR_RADIUS = 4;
// The grant-envelope outline sits slightly wider than the cost bar so there's
// a small gap on each side, as in the design.
const TARGET_SIDE_GAP = 4;

type ChartDatum = {
    name: string;
    cost: number;
    amount: number | null;
};

type BudgetBarShapeProps = {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: ChartDatum;
    withinColor: string;
    excessColor: string;
    targetColor: string;
};

const styles = {
    chartBody: {
        width: '100%',
        flex: 1,
        minHeight: 0,
    },
} satisfies SxStyles;

// A rectangle whose top corners are rounded and bottom corners square, so bars
// sit flush on the axis baseline (matches the averted-cases / prevalence cards).
const roundedTopRectPath = (
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
): string => {
    const r = Math.max(0, Math.min(radius, width / 2, height));
    return [
        `M${x},${y + height}`,
        `L${x},${y + r}`,
        `Q${x},${y} ${x + r},${y}`,
        `L${x + width - r},${y}`,
        `Q${x + width},${y} ${x + width},${y + r}`,
        `L${x + width},${y + height}`,
        'Z',
    ].join(' ');
};

// Same shape but left open at the bottom, so the envelope outline has no line
// along the baseline.
const roundedTopOutlinePath = (
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
): string => {
    const r = Math.max(0, Math.min(radius, width / 2, height));
    return [
        `M${x},${y + height}`,
        `L${x},${y + r}`,
        `Q${x},${y} ${x + r},${y}`,
        `L${x + width - r},${y}`,
        `Q${x + width},${y} ${x + width},${y + r}`,
        `L${x + width},${y + height}`,
    ].join(' ');
};

// Custom bar shape: a single `<Bar dataKey="cost">` is rendered so recharts
// sizes (x, y, width, height) the bar against the cost value. We derive a
// pixels-per-value factor from that sizing and redraw the bar as:
//  - a grey rect up to min(cost, amount),
//  - a red rect for the part of cost that exceeds the grant amount,
//  - a dashed, unfilled rect outlining the grant amount target.
// Only the topmost segment gets rounded top corners.
const BudgetBarShape: FC<BudgetBarShapeProps> = ({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    payload,
    withinColor,
    excessColor,
    targetColor,
}) => {
    const cost = payload?.cost ?? 0;
    const amount = payload?.amount ?? null;

    if (cost <= 0 || height <= 0) {
        return null;
    }

    const pxPerValue = height / cost;
    const baseline = y + height;

    const withinValue = amount != null ? Math.min(cost, amount) : cost;
    const withinHeight = withinValue * pxPerValue;
    const hasExcess = amount != null && cost > amount;
    const excessHeight = hasExcess ? (cost - amount) * pxPerValue : 0;
    const targetHeight = amount != null ? amount * pxPerValue : 0;

    return (
        <g>
            {hasExcess ? (
                <rect
                    x={x}
                    y={baseline - withinHeight}
                    width={width}
                    height={withinHeight}
                    fill={withinColor}
                />
            ) : (
                <path
                    d={roundedTopRectPath(
                        x,
                        baseline - withinHeight,
                        width,
                        withinHeight,
                        BAR_RADIUS,
                    )}
                    fill={withinColor}
                />
            )}
            {hasExcess && (
                <path
                    d={roundedTopRectPath(
                        x,
                        baseline - withinHeight - excessHeight,
                        width,
                        excessHeight,
                        BAR_RADIUS,
                    )}
                    fill={excessColor}
                />
            )}
            {amount != null && (
                <path
                    d={roundedTopOutlinePath(
                        x - TARGET_SIDE_GAP,
                        baseline - targetHeight,
                        width + TARGET_SIDE_GAP * 2,
                        targetHeight,
                        0,
                    )}
                    fill="none"
                    stroke={targetColor}
                    strokeDasharray="1 4"
                    strokeLinecap="round"
                    strokeWidth={1.75}
                />
            )}
        </g>
    );
};

export const BudgetSummary: FC = () => {
    const { formatMessage } = useSafeIntl();
    const theme = useTheme();
    const { gridProps, axisProps } = useChartTheme();
    const { scenarioId } = usePlanningContext();
    const { data, isLoading } = useGetBudgetByGrant(scenarioId);

    const withinColor = blueGrey[200]; // #B0BEC5
    const excessColor = red[500]; // #F44336
    const targetColor = theme.palette.primary.main;

    const chartData: ChartDatum[] = useMemo(
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

    const renderTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) {
            return null;
        }
        const datum: ChartDatum = payload[0].payload;
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
                                    width={50}
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
