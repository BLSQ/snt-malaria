import React, { FC, useMemo } from 'react';
import { Box, Card, CardContent, CardHeader, Divider } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { useGetInterventionCostBreakdownLineCategories } from '../../../settings/hooks/useGetInterventionCostBreakdownLineCategories';
import {
    formatCostValue,
    getCostBreakdownChartData,
} from '../../libs/cost-utils';
import { BudgetIntervention } from '../../types/budget';
import { ChartLegend } from './ChartLegend';

type Props = {
    interventionBudgets: BudgetIntervention[];
};

const styles: SxStyles = {
    mainBox: {
        borderRadius: theme => theme.spacing(2),
        overflow: 'hidden',
        height: '493px',
        position: 'relative',
    },
    card: { height: '100%', display: 'flex', flexDirection: 'column' },
    cardContent: {
        marginTop: 4,
        padding: 1,
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        '&:last-child': {
            paddingBottom: 0,
        },
    },
    legendWrapper: {
        display: 'flex',
        flexDirection: 'row',
    },
};
const LEGEND_COLORS = ['#522da9', '#7452ba', '#9477ca', '#b29cda', '#d1c3e9'];

export const CostBreakdownChart: FC<Props> = ({ interventionBudgets }) => {
    const { formatMessage } = useSafeIntl();
    const { data: interventionCostCategories = [] } =
        useGetInterventionCostBreakdownLineCategories();
    const data = useMemo(() => {
        return getCostBreakdownChartData(interventionBudgets);
    }, [interventionBudgets]);

    const barsConfig = useMemo(() => {
        if (!interventionCostCategories) {
            return;
        }

        return interventionCostCategories.map((c, index) => ({
            color: LEGEND_COLORS[index],
            label: c.label,
            key: c.value,
        }));
    }, [interventionCostCategories]);

    return (
        <Box sx={styles.mainBox}>
            <Card sx={styles.card}>
                <CardHeader
                    title={formatMessage(MESSAGES.costBreakdownChartTitle)}
                    titleTypographyProps={{ variant: 'h6' }}
                ></CardHeader>
                <Divider />
                <CardContent sx={styles.cardContent}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <XAxis
                                dataKey="interventionName"
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={formatCostValue}
                            />
                            <CartesianGrid
                                vertical={false}
                                strokeDasharray="1"
                            />
                            <Tooltip
                                cursor={false}
                                formatter={(value: number) =>
                                    formatCostValue(value)
                                }
                            />

                            {barsConfig?.map(bar => (
                                <Bar
                                    dataKey={bar.key}
                                    fill={bar.color}
                                    key={bar.key}
                                    barSize={18}
                                    stackId="a"
                                    name={bar.label}
                                />
                            ))}
                            <Legend
                                verticalAlign="bottom"
                                align="center"
                                content={({ payload }) => (
                                    <ChartLegend
                                        wrapperSx={styles.legendWrapper}
                                        payload={payload}
                                    />
                                )}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </Box>
    );
};
