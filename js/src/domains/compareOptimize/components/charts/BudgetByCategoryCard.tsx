import React, { FC, useMemo } from 'react';
import PieChartOutlinedIcon from '@mui/icons-material/PieChartOutlined';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { ChartLegend } from '../../../planning/components/budgeting/ChartLegend';
import { formatBigNumber } from '../../../planning/libs/cost-utils';
import { BudgetCalculationResponse } from '../../../planning/types/budget';
import { useComparisonDataContext } from '../../ComparisonDataContext';
import { getInterventionGroupShades } from '../../utils/colors';
import { Card } from '../Card';
import { ChartEmptyState } from './ChartEmptyState';

type BudgetCategoryDatum = {
    name: string;
    value: number;
};

const styles = {
    chartGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 2,
        height: '100%',
    },
    chartItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: 0,
        minHeight: 0,
        height: '100%',
    },
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

const getCategoryTotals = (
    budget?: BudgetCalculationResponse,
): BudgetCategoryDatum[] => {
    if (!budget?.results?.length) return [];

    const totals = new Map<string, number>();
    budget.results.forEach(result => {
        result.interventions?.forEach(intervention => {
            intervention.cost_breakdown?.forEach(line => {
                totals.set(line.category, (totals.get(line.category) ?? 0) + line.cost);
            });
        });
    });

    return [...totals.entries()]
        .map(([name, value]) => ({ name, value }))
        .filter(entry => entry.value > 0)
        .sort((a, b) => b.value - a.value);
};

export const BudgetByCategoryCard: FC = () => {
    const { scenarios, budgetsByScenarioId } = useComparisonDataContext();
    const { formatMessage } = useSafeIntl();
    const chartData = useMemo(
        () =>
            scenarios.map(scenario => {
                const data = getCategoryTotals(
                    budgetsByScenarioId.get(scenario.id),
                );
                return {
                    scenario,
                    data,
                    colors: getInterventionGroupShades(
                        scenario.color,
                        data.length,
                    ),
                };
            }),
        [scenarios, budgetsByScenarioId],
    );

    return (
        <Card
            title={formatMessage(MESSAGES.budgetByCategoryTitle)}
            icon={PieChartOutlinedIcon}
            bodySx={{ minHeight: 360 }}
        >
            <Box sx={styles.chartGrid}>
                {chartData.map(({ scenario, data, colors }) => (
                    <Box key={scenario.id} sx={styles.chartItem}>
                        {data.length === 0 ? (
                            <ChartEmptyState message={formatMessage(MESSAGES.noBudgetData)} />
                        ) : (
                            <Box sx={styles.chartBody}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Tooltip
                                            formatter={(value: number) =>
                                                formatBigNumber(value)
                                            }
                                        />
                                        <Pie
                                            data={data}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius="60%"
                                            outerRadius="100%"
                                        >
                                            {data.map((entry, index) => (
                                                <Cell
                                                    key={`${scenario.id}-${entry.name}`}
                                                    fill={colors[index]}
                                                />
                                            ))}
                                        </Pie>
                                        <Legend
                                            layout="horizontal"
                                            align="center"
                                            verticalAlign="bottom"
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
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        )}
                    </Box>
                ))}
            </Box>
        </Card>
    );
};
