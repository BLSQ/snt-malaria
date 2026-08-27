import React, { FC, ReactNode } from 'react';
import { Box, useTheme } from '@mui/material';
import {
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { SxStyles } from 'Iaso/types/general';
import { ChartEmptyState } from '../../../../../components/charts/ChartEmptyState';
import { MergedInterventionRow } from '../../../types/comparisonAggregation';
import { ComparisonSlot } from '../types';
import { buildRowTooltipContent, toChartData } from './mergedRowChart';

const styles = {
    chartBody: {
        width: '100%',
        flex: 1,
        minHeight: 0,
    },
} satisfies SxStyles;

type Props = {
    // valueBySlotKey holds a percentage (0-100) per slot.
    rows: MergedInterventionRow[];
    slots: ComparisonSlot[];
    renderTooltip: (row: MergedInterventionRow) => ReactNode;
    emptyMessage: string;
};

/**
 * Radar view of the same districts-covered figures as
 * `OverlayGroupedBarChart`, expressed as a percentage of the total district
 * count so every intervention shares one comparable 0-100 scale.
 */
export const DistrictsRadarChart: FC<Props> = ({
    rows,
    slots,
    renderTooltip,
    emptyMessage,
}) => {
    const theme = useTheme();
    const axisColor = theme.palette.text.secondary;

    if (rows.length === 0) {
        return <ChartEmptyState message={emptyMessage} />;
    }

    return (
        <Box sx={styles.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={toChartData(rows)}>
                    <PolarGrid stroke={theme.palette.divider} />
                    <PolarAngleAxis
                        dataKey="interventionLabel"
                        tick={{ fill: axisColor, fontSize: '0.75rem' }}
                    />
                    <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fill: axisColor, fontSize: '0.7rem' }}
                        tickFormatter={value => `${value}%`}
                    />
                    <Tooltip
                        content={buildRowTooltipContent(rows, renderTooltip)}
                    />
                    {slots.map(slot => (
                        <Radar
                            key={slot.key}
                            dataKey={slot.key}
                            stroke={slot.color}
                            fill={slot.color}
                            fillOpacity={0.15}
                            isAnimationActive={false}
                        />
                    ))}
                </RadarChart>
            </ResponsiveContainer>
        </Box>
    );
};
