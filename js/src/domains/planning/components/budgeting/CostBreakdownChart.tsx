import React, { FC, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Divider,
    List,
    ListItem,
    Typography,
} from '@mui/material';
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
import { getCostBreakdownChartData } from '../../libs/cost-utils';

type Props = {
    interventionBudgets: any[];
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
    legendColorBox: {
        width: '1rem',
        height: '1rem',
        marginRight: 1,
        borderRadius: 0.5,
    },
    legendItem: {
        width: 'auto',
        paddingRight: 0,
    },
};

const LEGEND_COLORS = ['#522da9', '#7452ba', '#9477ca', '#b29cda', '#d1c3e9'];
const BARS = [
    { color: LEGEND_COLORS[0], label: 'Procurement', key: 'Procurement' },
    { color: LEGEND_COLORS[1], label: 'Distribution', key: 'Distribution' },
    { color: LEGEND_COLORS[2], label: 'Operational', key: 'Operational' },
    { color: LEGEND_COLORS[3], label: 'Supportive', key: 'Supportive' },
    { color: LEGEND_COLORS[4], label: 'Other', key: 'Other' },
];

export const CostBreakdownChart: FC<Props> = ({ interventionBudgets }) => {
    const { formatMessage } = useSafeIntl();
    const data = useMemo(() => {
        return getCostBreakdownChartData(interventionBudgets);
    }, [interventionBudgets]);

    const renderLegend = props => {
        const { payload } = props;

        return (
            <List sx={{ display: 'flex', flexDirection: 'row' }}>
                {payload.map(entry => (
                    <ListItem
                        key={`item-${entry.value}`}
                        sx={styles.legendItem}
                    >
                        <Box
                            sx={{
                                ...styles.legendColorBox,
                                backgroundColor: entry.color,
                            }}
                        ></Box>
                        <Typography variant="body2">{entry.value}</Typography>
                    </ListItem>
                ))}
            </List>
        );
    };
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
                            <YAxis axisLine={false} tickLine={false} />
                            <CartesianGrid
                                vertical={false}
                                strokeDasharray="1"
                            />
                            <Tooltip cursor={false} />

                            {BARS.map(bar => (
                                <Bar
                                    dataKey={bar.key}
                                    fill={bar.color}
                                    key={bar.key}
                                    barSize={18}
                                    stackId="a"
                                />
                            ))}
                            <Legend
                                verticalAlign="bottom"
                                align="center"
                                content={renderLegend}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </Box>
    );
};
