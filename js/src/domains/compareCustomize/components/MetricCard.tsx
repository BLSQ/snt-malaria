import React, { ReactNode } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { WidgetCard } from '../../../components/WidgetCard';
import {
    DeltaChip,
    getDeltaChip,
    type DeltaChipOptions,
    type DeltaChipProps,
} from './DeltaChip';

// TKey defaults to number (compareCustomize keys entries by scenario id);
// the Comparison tab (planning/components/comparisonTab) instantiates it
// with a string slot key instead, since the same scenario id can occupy two
// slots with different years there.
export type MetricEntry<TKey extends string | number = number> = {
    id: TKey;
    color: string;
    isBaseline: boolean;
    value: string;
    chip?: DeltaChipProps;
};

type Props<TKey extends string | number = number> = {
    title: string;
    icon: React.ElementType;
    isLoading: boolean;
    entries: MetricEntry<TKey>[];
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

export const buildMetricEntries = <
    TData,
    TKey extends string | number = number,
>(
    scenarios: { id: TKey; color: string }[],
    dataMap: Map<TKey, TData | undefined>,
    extractor: (data: TData | undefined) => number | undefined,
    formatter: (v: number) => string,
    delta: DeltaChipOptions,
): MetricEntry<TKey>[] => {
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

export const MetricCard = <TKey extends string | number = number>({
    title,
    icon,
    isLoading,
    entries,
    keyPrefix,
    subtext,
}: Props<TKey>) => (
    <Grid item xs={12} md={3}>
        <WidgetCard title={title} icon={icon} isLoading={isLoading}>
            <Box sx={styles.valuesList}>
                {entries.map(entry => (
                    <Typography
                        key={`${keyPrefix}-${entry.id}`}
                        variant="h5"
                        sx={[
                            styles.valueRow,
                            entry.isBaseline && {
                                color: 'text.secondary',
                            },
                        ]}
                    >
                        <Box
                            component="span"
                            sx={[styles.dot, { backgroundColor: entry.color }]}
                        />
                        {entry.value}
                        {entry.chip && <DeltaChip {...entry.chip} />}
                    </Typography>
                ))}
            </Box>
            {subtext}
        </WidgetCard>
    </Grid>
);
