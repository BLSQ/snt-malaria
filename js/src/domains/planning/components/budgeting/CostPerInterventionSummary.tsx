import React, { FC, useMemo } from 'react';
import { VaccinesOutlined } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import { lighten } from '@mui/material/styles';
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
import {
    AUTO_Y_AXIS_TICK_MARGIN,
    useAutoYAxisWidth,
} from '../../../../components/useAutoYAxisWidth';
import { WidgetCard } from '../../../../components/WidgetCard';
import { useGetInterventionCostBreakdownLineCategories } from '../../../interventions/hooks/useGetInterventionCostBreakdownLineCategories';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import {
    aggregateInterventionCosts,
    aggregateOrgUnitCosts,
} from '../../libs/budget-aggregation';
import { CATEGORY_COLORS } from '../../libs/color-utils';
import {
    formatBigNumber,
    getCostBreakdownChartData,
} from '../../libs/cost-utils';
import { BudgetIntervention } from '../../types/budget';

const BAR_SIZE = 22;
const BAR_RADIUS = 4;
// Lightest cost-segment is this much lighter than the bar's base colour. Each
// cost segment (procurement, distribution, ...) is a progressively lighter hue.
const MAX_LIGHTEN = 0.6;
const UNCATEGORIZED_KEY = -1;
const BASE_COLOR_KEY = '__baseColor';
const TOTAL_KEY = '__total';

// Longest intervention label shown in full on the y-axis; longer ones are
// truncated with an ellipsis (and cap the axis width at this label's width).
const Y_AXIS_MAX_LABEL = 'Dual AI (Campaign)';

type ChartRow = Record<string, string | number>;

type CostCategory = { value: string; label: string };

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

// Rectangle with only its right corners rounded, so the outer end of the bar
// is rounded like the design while it stays flush with the value axis.
const roundedRightRectPath = (
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
): string => {
    const r = Math.max(0, Math.min(radius, width, height / 2));
    return [
        `M${x},${y}`,
        `L${x + width - r},${y}`,
        `Q${x + width},${y} ${x + width},${y + r}`,
        `L${x + width},${y + height - r}`,
        `Q${x + width},${y + height} ${x + width - r},${y + height}`,
        `L${x},${y + height}`,
        'Z',
    ].join(' ');
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

export const CostPerInterventionSummary: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { gridProps, axisProps } = useChartTheme();
    const { budgets, orgUnits, interventionCategories } = usePlanningContext();
    const { data: costCategories = [], isLoading } =
        useGetInterventionCostBreakdownLineCategories();

    const orgUnitIds = useMemo(
        () => new Set(orgUnits.map(ou => ou.id)),
        [orgUnits],
    );

    // Intervention id -> its intervention category id.
    const categoryIdByInterventionId = useMemo(() => {
        const map = new Map<number, number>();
        interventionCategories.forEach(category => {
            category.interventions.forEach(intervention => {
                map.set(intervention.id, category.id);
            });
        });
        return map;
    }, [interventionCategories]);

    // Interventions sorted so that those sharing a category sit together
    // (groups ordered by total cost desc, interventions within a group too).
    const orderedInterventions = useMemo(() => {
        const interventions = aggregateInterventionCosts(
            aggregateOrgUnitCosts(budgets, orgUnitIds),
        );

        const categoryOf = (intervention: BudgetIntervention) =>
            categoryIdByInterventionId.get(intervention.id) ??
            UNCATEGORIZED_KEY;

        const totalByCategory = new Map<number, number>();
        interventions.forEach(intervention => {
            const categoryId = categoryOf(intervention);
            totalByCategory.set(
                categoryId,
                (totalByCategory.get(categoryId) ?? 0) +
                    intervention.total_cost,
            );
        });

        return [...interventions].sort((a, b) => {
            const catA = categoryOf(a);
            const catB = categoryOf(b);
            if (catA !== catB) {
                return (
                    (totalByCategory.get(catB) ?? 0) -
                    (totalByCategory.get(catA) ?? 0)
                );
            }
            return b.total_cost - a.total_cost;
        });
    }, [budgets, orgUnitIds, categoryIdByInterventionId]);

    // Stable base colour per category, assigned in the order categories first
    // appear in the (cost-sorted) intervention list.
    const baseColorByCategoryId = useMemo(() => {
        const map = new Map<number, string>();
        let next = 0;
        orderedInterventions.forEach(intervention => {
            const categoryId =
                categoryIdByInterventionId.get(intervention.id) ??
                UNCATEGORIZED_KEY;
            if (!map.has(categoryId)) {
                map.set(
                    categoryId,
                    CATEGORY_COLORS[next % CATEGORY_COLORS.length],
                );
                next += 1;
            }
        });
        return map;
    }, [orderedInterventions, categoryIdByInterventionId]);

    // Chart rows enriched with each bar's base colour and total so the custom
    // bar shape (and the tooltip) can colour the cost segments consistently.
    const chartData = useMemo(() => {
        const rows = getCostBreakdownChartData(
            orderedInterventions,
        ) as ChartRow[];
        return rows.map((row, index) => {
            const intervention = orderedInterventions[index];
            const baseColor =
                baseColorByCategoryId.get(
                    categoryIdByInterventionId.get(intervention.id) ??
                        UNCATEGORIZED_KEY,
                ) ?? CATEGORY_COLORS[0];
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
    }, [
        orderedInterventions,
        baseColorByCategoryId,
        categoryIdByInterventionId,
        costCategories,
    ]);

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
                    value: formatBigNumber(value),
                    color: shadeForSegment(base, index, costCategories.length),
                });
            }
        });
        return (
            <ChartTooltip title={row.interventionType as string} rows={rows} />
        );
    };

    const hasData = !isLoading && chartData.length > 0;

    const yAxisLabels = useMemo(
        () =>
            chartData.map(row =>
                String((row as ChartRow).interventionType ?? ''),
            ),
        [chartData],
    );
    const { width: yAxisWidth, formatTick: formatYAxisTick } =
        useAutoYAxisWidth({
            labels: yAxisLabels,
            maxLabel: Y_AXIS_MAX_LABEL,
        });

    return (
        <WidgetCard
            title={formatMessage(MESSAGES.costPerInterventionTitle)}
            icon={VaccinesOutlined}
            isLoading={isLoading}
            bodySx={{ display: 'flex', flexDirection: 'column' }}
        >
            {!hasData ? (
                <Typography variant="body2" color="textSecondary">
                    {formatMessage(MESSAGES.noBudgetData)}
                </Typography>
            ) : (
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
                                    formatBigNumber(value as number)
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
                                shape={
                                    <CostBarShape
                                        costCategories={costCategories}
                                    />
                                }
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </WidgetCard>
    );
};
