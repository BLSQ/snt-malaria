import React, { FC, ReactNode } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { ScenarioDisplay } from '../types';
import { Card } from './Card';
import {
    DeltaChip,
    getDeltaChip,
    type DeltaChipOptions,
    type DeltaChipProps,
} from './DeltaChip';

export type MetricEntry = {
    id: number;
    color: string;
    isBaseline: boolean;
    value: string;
    chip?: DeltaChipProps;
};

type Props = {
    title: string;
    icon: React.ElementType;
    isLoading: boolean;
    entries: MetricEntry[];
    keyPrefix: string;
    subtext?: ReactNode;
};

const styles = {
    valuesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        mb: 1.5,
    },
    valueRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontWeight: 400,
        fontSize: '1.5rem',
        lineHeight: 1.2,
        m: 0,
    },
    dot: {
        width: theme => theme.spacing(1.75),
        height: theme => theme.spacing(1.75),
        borderRadius: '50%',
        flex: '0 0 auto',
    },
} satisfies SxStyles;

export const buildMetricEntries = <TData,>(
    scenarios: ScenarioDisplay[],
    dataMap: Map<number, TData | undefined>,
    extractor: (data: TData | undefined) => number | undefined,
    formatter: (v: number) => string,
    delta: DeltaChipOptions,
): MetricEntry[] => {
    const baselineId = scenarios[0]?.id;
    const baselineValue =
        baselineId !== undefined
            ? extractor(dataMap.get(baselineId))
            : undefined;

    return scenarios.map(scenario => {
        const raw = extractor(dataMap.get(scenario.id));
        const isBaseline = scenario.id === baselineId;
        return {
            id: scenario.id,
            color: scenario.color,
            isBaseline,
            value: raw === undefined ? '-' : formatter(raw),
            chip: isBaseline
                ? undefined
                : getDeltaChip(raw, baselineValue, delta),
        };
    });
};

export const MetricCard: FC<Props> = ({
    title,
    icon,
    isLoading,
    entries,
    keyPrefix,
    subtext,
}) => (
    <Grid item xs={12} md={3}>
        <Card title={title} icon={icon} isLoading={isLoading}>
            <Box sx={styles.valuesList}>
                {entries.map(entry => (
                    <Typography
                        key={`${keyPrefix}-${entry.id}`}
                        variant="h6"
                        sx={[
                            styles.valueRow,
                            entry.isBaseline && {
                                color: 'text.secondary',
                            },
                        ]}
                    >
                        <Box
                            component="span"
                            sx={[
                                styles.dot,
                                { backgroundColor: entry.color },
                            ]}
                        />
                        {entry.value}
                        {entry.chip && <DeltaChip {...entry.chip} />}
                    </Typography>
                ))}
            </Box>
            {subtext}
        </Card>
    </Grid>
);
