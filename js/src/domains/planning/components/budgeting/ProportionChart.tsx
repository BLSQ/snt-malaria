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
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { INTERVENTION_COLORS } from '../../libs/cost-utils';

type Props = { interventionBudgets: any[] };

const DEFAULT_COLOR = '#512DA8';

const styles: SxStyles = {
    mainBox: {
        borderRadius: theme => theme.spacing(2),
        overflow: 'hidden',
        height: '493px',
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
};

export const ProportionChart: FC<Props> = ({ interventionBudgets }) => {
    const { formatMessage } = useSafeIntl();

    const data = useMemo(
        () =>
            interventionBudgets?.map(b => ({
                name: b.name,
                value: b.cost,
            })),
        [interventionBudgets],
    );

    const renderLegend = props => {
        const { payload } = props;

        return (
            <List>
                {payload.map(entry => (
                    <ListItem key={`item-${entry.value}`}>
                        <Box
                            sx={{
                                ...styles.legendColorBox,
                                backgroundColor: entry.color,
                            }}
                        ></Box>
                        <Typography variant="body2">
                            {entry.value}{' '}
                            <b> {Math.round(entry.payload.percent * 100)}%</b>
                        </Typography>
                    </ListItem>
                ))}
            </List>
        );
    };
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
                            <Tooltip />
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
                                            DEFAULT_COLOR
                                        }
                                    />
                                ))}
                            </Pie>
                            <Legend
                                layout="vertical"
                                align="right"
                                verticalAlign="middle"
                                content={renderLegend}
                                wrapperStyle={{ left: 'calc(50% + 3rem)' }}
                            ></Legend>
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </Box>
    );
};
