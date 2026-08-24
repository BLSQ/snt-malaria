import React, { FC, ReactNode } from 'react';
import { Box } from '@mui/material';
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
import { ChartEmptyState } from '../../../../../components/charts/ChartEmptyState';
import { useChartTheme } from '../../../../../components/charts/chartTheme';
import { MergedInterventionRow } from '../../../types/comparisonAggregation';
import { ComparisonSlot } from '../types';
import { buildRowTooltipContent, toChartData } from './mergedRowChart';

const BAR_SIZE = 40;
const BAR_GAP = 3;
const MIN_GROUP_GAP = 16;
const X_AXIS_HEIGHT = 56;
const Y_AXIS_WIDTH = 56;

const styles = {
    chartBody: {
        width: '100%',
        flex: 1,
        minHeight: 0,
    },
} satisfies SxStyles;

type Props = {
    rows: MergedInterventionRow[];
    slots: ComparisonSlot[];
    valueFormatter: (value: number) => string;
    renderTooltip: (row: MergedInterventionRow) => ReactNode;
    emptyMessage: string;
};

/**
 * Overlay-mode chart for the Comparison tab: one grouped vertical bar per
 * intervention, one bar per slot, coloured by slot.
 */
export const OverlayGroupedBarChart: FC<Props> = ({
    rows,
    slots,
    valueFormatter,
    renderTooltip,
    emptyMessage,
}) => {
    const { gridProps, axisProps } = useChartTheme();

    if (rows.length === 0) {
        return <ChartEmptyState message={emptyMessage} />;
    }

    return (
        <Box sx={styles.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={toChartData(rows)}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    barGap={BAR_GAP}
                    barCategoryGap={MIN_GROUP_GAP}
                >
                    <CartesianGrid vertical={false} {...gridProps} />
                    <XAxis
                        dataKey="interventionLabel"
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={X_AXIS_HEIGHT}
                        {...axisProps}
                        tickMargin={8}
                    />
                    <YAxis
                        type="number"
                        width={Y_AXIS_WIDTH}
                        tickFormatter={value => valueFormatter(value as number)}
                        {...axisProps}
                        tickMargin={4}
                    />
                    <Tooltip
                        cursor={false}
                        content={buildRowTooltipContent(rows, renderTooltip)}
                    />
                    {slots.map(slot => (
                        <Bar
                            key={slot.key}
                            dataKey={slot.key}
                            fill={slot.color}
                            barSize={BAR_SIZE}
                            isAnimationActive={false}
                            radius={[3, 3, 0, 0]}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
};
