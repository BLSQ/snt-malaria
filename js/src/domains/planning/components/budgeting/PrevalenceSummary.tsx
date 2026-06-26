import React, { FC, useMemo } from 'react';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import { Box, useTheme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    CartesianGrid,
    ErrorBar,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { SxStyles } from 'Iaso/types/general';
import { ChartEmptyState } from '../../../../components/charts/ChartEmptyState';
import { useChartTheme } from '../../../../components/charts/chartTheme';
import {
    ChartTooltip,
    ChartTooltipRow,
} from '../../../../components/charts/ChartTooltip';
import { useAutoYAxisWidth } from '../../../../components/useAutoYAxisWidth';
import { WidgetCard } from '../../../../components/WidgetCard';
import { useGetImpactAgeGroups } from '../../../compareCustomize/hooks/useGetImpactAgeGroups';
import { useGetImpactYearRange } from '../../../compareCustomize/hooks/useGetImpactYearRange';
import { useGetScenarioImpact } from '../../../compareCustomize/hooks/useGetScenarioImpact';
import { ScenarioImpactMetrics } from '../../../compareCustomize/types';
import {
    buildPrevalenceChartData,
    getPrevalenceMaxValue,
} from '../../../compareCustomize/utils/chartData';
import { intersectYearRanges } from '../../../compareCustomize/utils/yearRange';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { formatPercentValue } from '../../libs/cost-utils';

// Main purple, matching the comparison page's first comparison scenario line.
const LINE_COLOR = '#673AB7';

const styles = {
    chartBody: {
        width: '100%',
        flex: 1,
        minHeight: 0,
    },
} satisfies SxStyles;

export const PrevalenceSummary: FC = () => {
    const { formatMessage } = useSafeIntl();
    const theme = useTheme();
    const { gridProps, axisProps } = useChartTheme();
    const { scenarioId, scenario } = usePlanningContext();

    const yearRangeQuery = useGetImpactYearRange();
    const ageGroupsQuery = useGetImpactAgeGroups();
    const ageGroup = ageGroupsQuery.data?.age_groups?.[0];

    const yearRange = useMemo((): [number, number] | undefined => {
        if (!scenario || !yearRangeQuery.data) return undefined;
        return intersectYearRanges(
            [scenario.start_year, scenario.end_year],
            [yearRangeQuery.data.min_year, yearRangeQuery.data.max_year],
        );
    }, [scenario, yearRangeQuery.data]);

    const { data: impact, isFetching } = useGetScenarioImpact(
        scenarioId,
        yearRange?.[0],
        yearRange?.[1],
        ageGroup,
        Boolean(yearRange) && Boolean(ageGroup),
    );

    const lineLabel = formatMessage(
        MESSAGES.impactDifferenceMetricPrevalenceRate,
    );

    const scenarios = useMemo(
        () => [{ id: scenarioId, label: lineLabel, color: LINE_COLOR }],
        [scenarioId, lineLabel],
    );

    const chartData = useMemo(() => {
        const impactMap = new Map<number, ScenarioImpactMetrics | undefined>([
            [scenarioId, impact],
        ]);
        return buildPrevalenceChartData(scenarios, impactMap);
    }, [scenarios, scenarioId, impact]);

    const isLoading =
        isFetching || yearRangeQuery.isFetching || ageGroupsQuery.isFetching;
    const hasData = chartData.length > 0;

    // Size the (numeric) value axis to its widest formatted tick so the percent
    // labels aren't clipped and the axis only takes the space it needs.
    const yAxisLabels = useMemo(
        () => [
            formatPercentValue(
                getPrevalenceMaxValue(
                    chartData,
                    scenarios.map(line => line.label),
                ),
            ),
        ],
        [chartData, scenarios],
    );
    const { width: yAxisWidth } = useAutoYAxisWidth({ labels: yAxisLabels });

    const renderTooltip = ({ active, label, payload }: any) => {
        if (!active || !payload?.length) {
            return null;
        }
        const rows: ChartTooltipRow[] = payload.map((entry: any) => ({
            label: entry.name,
            value: formatPercentValue(entry.value),
            color: entry.color,
        }));
        return <ChartTooltip title={label} rows={rows} />;
    };

    return (
        <WidgetCard
            title={formatMessage(MESSAGES.yearlyPrevalenceTitle)}
            icon={ShowChartOutlinedIcon}
            isLoading={isLoading}
            bodySx={{ display: 'flex', flexDirection: 'column' }}
        >
            {!isLoading && !hasData ? (
                <ChartEmptyState
                    message={formatMessage(MESSAGES.noImpactData)}
                />
            ) : (
                <Box sx={styles.chartBody}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 5, right: 5, left: 0, bottom: -5 }}
                        >
                            <CartesianGrid vertical={false} {...gridProps} />
                            <XAxis
                                dataKey="year"
                                {...axisProps}
                                tickMargin={4}
                            />
                            <YAxis
                                tickFormatter={formatPercentValue}
                                {...axisProps}
                                width={yAxisWidth}
                                tickMargin={2}
                            />
                            <Tooltip content={renderTooltip} />
                            {scenarios.map(line => (
                                <Line
                                    key={line.id}
                                    type="monotone"
                                    dataKey={line.label}
                                    stroke={line.color}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    connectNulls
                                >
                                    <ErrorBar
                                        dataKey={`${line.label}_ci`}
                                        width={4}
                                        strokeWidth={1.5}
                                        stroke={theme.palette.text.disabled}
                                    />
                                </Line>
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </WidgetCard>
    );
};
