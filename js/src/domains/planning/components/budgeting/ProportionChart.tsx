import React, { FC, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Divider,
    Typography,
} from '@mui/material';
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
import { getRandomColor } from '../../libs/color-utils';
import {
    formatBigNumber,
    formatPercentValue,
    INTERVENTION_COLORS,
} from '../../libs/cost-utils';
import { BudgetIntervention } from '../../types/budget';
import { ChartLegend } from './ChartLegend';

type Props = { interventionBudgets: BudgetIntervention[] };

const styles: SxStyles = {
    mainBox: {
        borderRadius: theme => theme.spacing(2),
        overflow: 'hidden',
        height: '600px',
        position: 'relative',
    },
    card: { height: '100%', display: 'flex', flexDirection: 'column' },
    cardContent: {
        padding: 0,
        height: '100%',
        overflow: 'hidden',
        '&:last-child': {
            paddingBottom: 0,
        },
    },
    legendColorBox: {
        width: '1rem',
        height: '1rem',
        marginRight: 1,
        borderRadius: 0.5,
    },
    legendItem: {
        minWidth: '120px',
    },
};

export const ProportionChart: FC<Props> = ({ interventionBudgets }) => {
    const { formatMessage } = useSafeIntl();
    const data = useMemo(
        () =>
            interventionBudgets?.map(b => ({
                name: b.type,
                value: b.total_cost,
            })),
        [interventionBudgets],
    );

    const renderLegend = ({ payload }) => (
        <ChartLegend
            wrapperSx={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
            }}
            payload={payload}
            renderValue={entry => (
                <Box sx={styles.legendItem}>
                    <Typography variant="body2">{entry.value}</Typography>
                    <Typography variant="body2" fontWeight={'bold'}>
                        {formatBigNumber(entry?.payload?.value ?? 0)} (
                        {formatPercentValue(entry?.payload?.percent ?? 0)})
                    </Typography>
                </Box>
            )}
        />
    );

    return (
        <Box sx={styles.mainBox}>
            <Card sx={styles.card}>
                <CardHeader
                    title={formatMessage(MESSAGES.proportionChart)}
                    titleTypographyProps={{ variant: 'h6' }}
                ></CardHeader>
                <Divider />
                <CardContent sx={styles.cardContent}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip
                                formatter={(value: number) =>
                                    formatBigNumber(value)
                                }
                            />
                            <Pie
                                data={data}
                                dataKey={'value'}
                                innerRadius={80}
                                outerRadius={120}
                            >
                                {data.map(entry => (
                                    <Cell
                                        key={`cell-${entry.name}`}
                                        fill={
                                            INTERVENTION_COLORS[entry.name] ??
                                            getRandomColor(entry.name)
                                        }
                                    />
                                ))}
                            </Pie>
                            <Legend
                                layout="horizontal"
                                align="left"
                                verticalAlign="bottom"
                                content={renderLegend}
                            ></Legend>
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </Box>
    );
};
