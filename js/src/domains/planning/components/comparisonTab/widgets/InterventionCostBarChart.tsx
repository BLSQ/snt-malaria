import React, { FC } from 'react';
import { Box, Typography } from '@mui/material';
import { lighten } from '@mui/material/styles';
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
import { roundedRightRectPath } from '../../../../../components/charts/barPaths';
import { useChartTheme } from '../../../../../components/charts/chartTheme';
import {
    ChartTooltip,
    ChartTooltipRow,
} from '../../../../../components/charts/ChartTooltip';
import {
    AUTO_Y_AXIS_TICK_MARGIN,
    useAutoYAxisWidth,
} from '../../../../../components/useAutoYAxisWidth';
import { MESSAGES } from '../../../../messages';
import { CATEGORY_COLORS } from '../../../libs/color-utils';
import { formatBigNumber, getCostBreakdownChartData } from '../../../libs/cost-utils';
import { BudgetIntervention } from '../../../types/budget';

const BAR_SIZE = 22;
const BAR_RADIUS = 4;
// Lightest cost-segment is this much lighter than the bar's base colour. Each
// cost segment (procurement, distribution, ...) is a progressively lighter hue.
const MAX_LIGHTEN = 0.6;
const BASE_COLOR_KEY = '__baseColor';
const TOTAL_KEY = '__total';

// Longest intervention label shown in full on the y-axis; longer ones are
// truncated with an ellipsis (and cap the axis width at this label's width).
const Y_AXIS_MAX_LABEL = 'Dual AI (Campaign)';

type ChartRow = Record<string, string | number>;

export type CostCategory = { value: string; label: string };

const styles = {
    chartBody: {
        width: '100%',
        flex: 1,
        minHeight: 0,
    },
} satisfies SxStyles;

/** Progressively lighter hue of `base` for cost segment `index` of `count`. */
const shadeForSegment = (
    base: string,
    index: number,
    count: number,
): string => {
    if (count <= 1) return base;
    return lighten(base, (index / (count - 1)) * MAX_LIGHTEN);
};

type CostBarShapeProps = {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: ChartRow;
    costCategories: CostCategory[];
};

// Draws a whole intervention bar: each cost segment is a lighter hue of the
// bar's category colour, and only the outermost segment gets rounded corners.
const CostBarShape: FC<CostBarShapeProps> = ({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    payload,
    costCategories,
}) => {
    if (!payload || width <= 0 || height <= 0) {
        return null;
    }
    const base = (payload[BASE_COLOR_KEY] as string) ?? CATEGORY_COLORS[0];
    const total = Number(payload[TOTAL_KEY] ?? 0);
    if (total <= 0) {
        return null;
    }

    const pxPerValue = width / total;
    let lastIndex = -1;
    costCategories.forEach((category, index) => {
        if (Number(payload[category.value] ?? 0) > 0) {
            lastIndex = index;
        }
    });

    let cursor = x;
    return (
        <g>
            {costCategories.map((category, index) => {
                const value = Number(payload[category.value] ?? 0);
                if (value <= 0) {
                    return null;
                }
                const segmentWidth = value * pxPerValue;
                const fill = shadeForSegment(
                    base,
                    index,
                    costCategories.length,
                );
                const segmentX = cursor;
                cursor += segmentWidth;
                if (index === lastIndex) {
                    return (
                        <path
                            key={category.value}
                            d={roundedRightRectPath(
                                segmentX,
                                y,
                                segmentWidth,
                                height,
                                BAR_RADIUS,
                            )}
                            fill={fill}
                        />
                    );
                }
                return (
                    <rect
                        key={category.value}
                        x={segmentX}
                        y={y}
                        width={segmentWidth}
                        height={height}
                        fill={fill}
                    />
                );
            })}
        </g>
    );
};

type Props = {
    interventions: BudgetIntervention[];
    colorByInterventionId: Map<number, string>;
    costCategories: CostCategory[];
    currency: string;
};

/**
 * Presentational horizontal stacked-cost-per-intervention bar chart, factored
 * out of `CostPerInterventionSummary` so it can be fed pre-aggregated data
 * for an arbitrary budget (e.g. one comparison slot) via props.
 */
export const InterventionCostBarChart: FC<Props> = ({
    interventions,
    colorByInterventionId,
    costCategories,
    currency,
}) => {
    const { formatMessage } = useSafeIntl();
    const { gridProps, axisProps } = useChartTheme();

    const chartData: ChartRow[] = (
        getCostBreakdownChartData(interventions) as ChartRow[]
    ).map((row, index) => {
        const intervention = interventions[index];
        const baseColor =
            colorByInterventionId.get(intervention.id) ?? CATEGORY_COLORS[0];
        const total = costCategories.reduce(
            (sum, category) => sum + Number(row[category.value] ?? 0),
            0,
        );
        return {
            ...row,
            [BASE_COLOR_KEY]: baseColor,
            [TOTAL_KEY]: total,
        };
    });

    const renderTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) {
            return null;
        }
        const row: ChartRow = payload[0].payload;
        const base = (row[BASE_COLOR_KEY] as string) ?? CATEGORY_COLORS[0];
        const rows: ChartTooltipRow[] = [];
        costCategories.forEach((category, index) => {
            const value = Number(row[category.value] ?? 0);
            if (value > 0) {
                rows.push({
                    label: category.label,
                    value: formatBigNumber(value, currency),
                    color: shadeForSegment(base, index, costCategories.length),
                });
            }
        });
        return (
            <ChartTooltip title={row.interventionType as string} rows={rows} />
        );
    };

    const { width: yAxisWidth, formatTick: formatYAxisTick } =
        useAutoYAxisWidth({
            labels: chartData.map(row => String(row.interventionType ?? '')),
            maxLabel: Y_AXIS_MAX_LABEL,
        });

    if (chartData.length === 0) {
        return (
            <Typography variant="body2" color="textSecondary">
                {formatMessage(MESSAGES.noBudgetData)}
            </Typography>
        );
    }

    return (
        <Box sx={styles.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    layout="vertical"
                    maxBarSize={BAR_SIZE}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                    <CartesianGrid horizontal={false} {...gridProps} />
                    <XAxis
                        type="number"
                        tickFormatter={value =>
                            formatBigNumber(value as number, currency)
                        }
                        {...axisProps}
                        tickMargin={4}
                    />
                    <YAxis
                        type="category"
                        dataKey="interventionType"
                        width={yAxisWidth}
                        tickFormatter={formatYAxisTick}
                        {...axisProps}
                        tickMargin={AUTO_Y_AXIS_TICK_MARGIN}
                    />
                    <Tooltip cursor={false} content={renderTooltip} />
                    <Bar
                        dataKey={TOTAL_KEY}
                        isAnimationActive={false}
                        shape={<CostBarShape costCategories={costCategories} />}
                    />
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
};
