import React, { FC, useMemo, useState } from 'react';
import { BubbleChartOutlined } from '@mui/icons-material';
import { Box, Typography, useTheme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { SxStyles } from 'Iaso/types/general';
import { ChartLegend } from '../../../../components/charts/ChartLegend';
import { useChartTheme } from '../../../../components/charts/chartTheme';
import {
    ChartTooltip,
    ChartTooltipRow,
} from '../../../../components/charts/ChartTooltip';
import { useAutoYAxisWidth } from '../../../../components/useAutoYAxisWidth';
import {
    WidgetCard,
    WidgetCardDropdown,
} from '../../../../components/WidgetCard';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { useInterventionCategoryColors } from '../../hooks/useInterventionCategoryColors';
import { aggregatePopulationLayersByIntervention } from '../../libs/budget-aggregation';
import {
    assignCategoricalColors,
    CATEGORY_COLORS,
} from '../../libs/color-utils';
import { formatBigNumber } from '../../libs/cost-utils';

const DOT_RADIUS = 6;
const LABEL_OFFSET = 10;
const ROW_DOT_OFFSET = DOT_RADIUS + 3;
const DEFAULT_DOT_COLOR = CATEGORY_COLORS[0];
const Y_AXIS_MAX_LABEL = 'Dual AI (Campaign)';
const CHART_RIGHT_MARGIN = 96;
const X_DOMAIN_PADDING = 1.15;

type XMetric = 'total' | 'per_capita';

type ChartRow = {
    interventionId: number;
    interventionLabel: string;
    layerName: string;
    cost: number;
    population: number;
    costPerCapita: number;
    color: string;
    rowDotIndex: number;
    rowDotCount: number;
};

const styles = {
    chartBody: {
        width: '100%',
        flex: 1,
        minHeight: 0,
    },
    legend: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: 0,
        marginTop: 1,
    },
} satisfies SxStyles;

type DotShapeProps = {
    cx?: number;
    cy?: number;
    payload?: ChartRow;
};

const PopulationLayerDot: FC<DotShapeProps> = ({ cx, cy, payload }) => {
    const theme = useTheme();
    if (cx == null || cy == null || !payload) {
        return null;
    }
    const offset =
        payload.rowDotCount > 1
            ? (payload.rowDotIndex - (payload.rowDotCount - 1) / 2) *
              ROW_DOT_OFFSET *
              2
            : 0;
    const dotCy = cy + offset;
    return (
        <g>
            <circle cx={cx} cy={dotCy} r={DOT_RADIUS} fill={payload.color} />
            {payload.rowDotCount > 1 && (
                <text
                    x={cx + DOT_RADIUS + LABEL_OFFSET}
                    y={dotCy}
                    dy={4}
                    fontSize="0.75rem"
                    fill={theme.palette.text.primary}
                >
                    {payload.layerName}
                </text>
            )}
        </g>
    );
};

export const CostVsPopulationSummary: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { gridProps, axisProps } = useChartTheme();
    const { budgets, currency } = usePlanningContext();
    const [xMetric, setXMetric] = useState<XMetric>('total');
    const [selectedYear, setSelectedYear] = useState<number | null>(null);

    const availableYears = useMemo(
        () =>
            Array.from(new Set(budgets.map(budget => budget.year))).sort(
                (a, b) => b - a,
            ),
        [budgets],
    );

    // Defaults to the most recent year until the user picks one explicitly.
    const effectiveYear = selectedYear ?? availableYears[0] ?? null;

    const interventions = useMemo(
        () =>
            budgets.find(budget => budget.year === effectiveYear)
                ?.interventions ?? [],
        [budgets, effectiveYear],
    );

    const { orderedInterventions } =
        useInterventionCategoryColors(interventions);

    const populationLayersByInterventionId = useMemo(
        () => aggregatePopulationLayersByIntervention(interventions),
        [interventions],
    );

    const rawRows = useMemo(() => {
        const rows: Omit<ChartRow, 'color'>[] = [];
        orderedInterventions.forEach(intervention => {
            const layers =
                populationLayersByInterventionId.get(intervention.id) ?? [];
            const positiveLayers = layers.filter(layer => layer.population > 0);
            positiveLayers.forEach((layer, index) => {
                rows.push({
                    interventionId: intervention.id,
                    interventionLabel: intervention.type,
                    layerName: layer.name,
                    cost: layer.cost,
                    population: layer.population,
                    costPerCapita: layer.cost / layer.population,
                    rowDotIndex: index,
                    rowDotCount: positiveLayers.length,
                });
            });
        });
        return rows;
    }, [orderedInterventions, populationLayersByInterventionId]);

    // Layer identity gets a fixed-order categorical colour (order is by
    // first appearance in the already cost-sorted `rawRows`, which is stable
    // across renders for a given scenario). A single distinct layer needs no
    // categorical colour or legend.
    const colorByLayerName = useMemo(() => {
        const colors = assignCategoricalColors(
            rawRows.map(row => row.layerName),
        );
        return colors.size <= 1 ? new Map<string, string>() : colors;
    }, [rawRows]);

    const chartData = useMemo(
        () =>
            rawRows.map(row => ({
                ...row,
                color: colorByLayerName.get(row.layerName) ?? DEFAULT_DOT_COLOR,
            })),
        [rawRows, colorByLayerName],
    );

    const xDataKey: keyof ChartRow =
        xMetric === 'total' ? 'cost' : 'costPerCapita';

    const xDomain = useMemo(() => {
        const values = chartData.map(row => row[xDataKey] as number);
        const max = values.length > 0 ? Math.max(...values) : 0;
        return [0, max * X_DOMAIN_PADDING];
    }, [chartData, xDataKey]);

    const yAxisLabels = useMemo(
        () => orderedInterventions.map(intervention => intervention.type),
        [orderedInterventions],
    );
    const { width: yAxisWidth, formatTick: formatYAxisTick } =
        useAutoYAxisWidth({
            labels: yAxisLabels,
            maxLabel: Y_AXIS_MAX_LABEL,
        });

    const legendPayload = useMemo(
        () =>
            Array.from(colorByLayerName.entries()).map(([name, color]) => ({
                value: name,
                color,
            })),
        [colorByLayerName],
    );

    const renderTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) {
            return null;
        }
        const row: ChartRow = payload[0].payload;
        const rows: ChartTooltipRow[] = [
            {
                label: row.layerName,
                value: formatBigNumber(row.population),
                color: row.color,
            },
            {
                label: formatMessage(MESSAGES.layerCostLabel),
                value: formatBigNumber(row.cost, currency),
            },
            {
                label: formatMessage(MESSAGES.costPerCapitaLabel),
                value: formatBigNumber(row.costPerCapita, currency),
            },
        ];
        return <ChartTooltip title={row.interventionLabel} rows={rows} />;
    };

    const hasData = chartData.length > 0;

    const dropdowns: WidgetCardDropdown<string | number>[] = [
        {
            value: xMetric,
            options: [
                {
                    value: 'total',
                    label: formatMessage(MESSAGES.summaryTotalCostTitle),
                },
                {
                    value: 'per_capita',
                    label: formatMessage(MESSAGES.costPerCapitaLabel),
                },
            ],
            onChange: value => setXMetric(value as XMetric),
        },
        {
            value: effectiveYear ?? '',
            options: availableYears.map(year => ({
                value: year,
                label: String(year),
            })),
            onChange: value => setSelectedYear(Number(value)),
            placeholder: formatMessage(MESSAGES.yearLabel),
            disabled: availableYears.length === 0,
        },
    ];

    return (
        <WidgetCard
            title={formatMessage(MESSAGES.costVsPopulationTitle)}
            icon={BubbleChartOutlined}
            dropdown={dropdowns}
            bodySx={{ display: 'flex', flexDirection: 'column' }}
        >
            {!hasData ? (
                <Typography variant="body2" color="textSecondary">
                    {formatMessage(MESSAGES.noBudgetData)}
                </Typography>
            ) : (
                <Box sx={styles.chartBody}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                            margin={{
                                top: 8,
                                right: CHART_RIGHT_MARGIN,
                                left: 0,
                                bottom: 0,
                            }}
                        >
                            <CartesianGrid horizontal={false} {...gridProps} />
                            <XAxis
                                type="number"
                                dataKey={xDataKey}
                                domain={xDomain}
                                tickFormatter={value =>
                                    formatBigNumber(value as number, currency)
                                }
                                {...axisProps}
                                tickMargin={4}
                            />
                            <YAxis
                                type="category"
                                dataKey="interventionLabel"
                                // Multiple rows can share one intervention (one
                                // dot per population layer): without this,
                                // recharts maps categories to ticks by array
                                // index rather than value, so every dot past
                                // the first on a shared row silently vanishes.
                                allowDuplicatedCategory={false}
                                width={yAxisWidth}
                                tickFormatter={formatYAxisTick}
                                {...axisProps}
                                tickMargin={4}
                            />
                            <Tooltip cursor={false} content={renderTooltip} />
                            {legendPayload.length > 0 && (
                                <Legend
                                    layout="horizontal"
                                    align="center"
                                    verticalAlign="bottom"
                                    payload={legendPayload}
                                    content={({ payload }) => (
                                        <ChartLegend
                                            wrapperSx={styles.legend}
                                            payload={payload}
                                            renderValue={entry => (
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontSize: '0.75rem' }}
                                                >
                                                    {entry.value}
                                                </Typography>
                                            )}
                                        />
                                    )}
                                />
                            )}
                            <Scatter
                                data={chartData}
                                isAnimationActive={false}
                                shape={<PopulationLayerDot />}
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </WidgetCard>
    );
};
