import React, { FC } from 'react';
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
    XAxis,
    YAxis,
} from 'recharts';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';

type Props = {};

const data = [
    {
        interventionName: 'Routine LLIN',
        Procurement: 4000,
        Distribution: 2400,
        Operational: 2400,
        Supportive: 0,
        Other: 0,
    },
    {
        interventionName: 'IPTp',
        Procurement: 4000,
        Distribution: 2400,
        Operational: 2400,
        Supportive: 0,
        Other: 0,
    },
    {
        interventionName: 'MDA',
        Procurement: 4000,
        Distribution: 2400,
        Operational: 2400,
        Supportive: 0,
        Other: 0,
    },
    {
        interventionName: 'RTS,S',
        Procurement: 4000,
        Distribution: 2400,
        Operational: 2400,
        Supportive: 0,
        Implementation: 0,
        Other: 0,
    },
    {
        interventionName: 'Campaign LLIN',
        Procurement: 4000,
        Distribution: 2400,
        Operational: 2400,
        Supportive: 0,
        Other: 0,
    },
    {
        interventionName: 'SMC',
        Procurement: 4000,
        Distribution: 2400,
        Operational: 2400,
        Supportive: 0,
        Other: 0,
    },
];

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

export const CostBreakdownChart: FC<Props> = ({}) => {
    const { formatMessage } = useSafeIntl();
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
                            <Bar
                                dataKey="Procurement"
                                stackId="a"
                                fill="#512DA8"
                                barSize={18}
                            />
                            <Bar
                                dataKey="Distribution"
                                stackId="a"
                                fill="#9575CD"
                            />
                            <Bar
                                dataKey="Operational"
                                stackId="a"
                                fill="#D1C4E9"
                            />
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
