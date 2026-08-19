import React, { FC, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { DeltaChip } from '../../../compareCustomize/components/DeltaChip';
import { buildMetricEntries } from '../../../compareCustomize/components/MetricCard';
import { MESSAGES } from '../../../messages';
import { useScenarioComparisonContext } from '../../contexts/ScenarioComparisonContext';
import { getSlotTotalCost } from '../../libs/comparison-aggregation';
import { formatBigNumber } from '../../libs/cost-utils';

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 0.5,
    },
    label: {
        fontSize: '0.7rem',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'text.secondary',
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: '50%',
        flexShrink: 0,
    },
} satisfies SxStyles;

/**
 * Compact total-cost readout for the Comparison tab's top bar (one line per
 * slot, baseline vs. delta) — sits next to the scenario/year selectors
 * instead of taking a full widget slot below.
 */
export const TotalCostSummary: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { slots, budgetsBySlotKey, currency } =
        useScenarioComparisonContext();

    const scenarios = useMemo(
        () => slots.map(slot => ({ id: slot.key, color: slot.color })),
        [slots],
    );

    const totalCostBySlotKey = useMemo(() => {
        const map = new Map<string, number | undefined>();
        slots.forEach(slot => {
            map.set(slot.key, getSlotTotalCost(budgetsBySlotKey.get(slot.key)));
        });
        return map;
    }, [slots, budgetsBySlotKey]);

    const entries = useMemo(
        () =>
            buildMetricEntries(
                scenarios,
                totalCostBySlotKey,
                value => value,
                (value: number) => formatBigNumber(value, currency),
                { relative: true, positiveIsGreen: false },
            ),
        [scenarios, totalCostBySlotKey, currency],
    );

    if (entries.length === 0) {
        return null;
    }

    return (
        <Box sx={styles.root}>
            <Typography sx={styles.label}>
                {formatMessage(MESSAGES.summaryTotalCostTitle)}
            </Typography>
            {entries.map(entry => (
                <Box key={entry.id} sx={styles.row}>
                    <Box
                        sx={[styles.dot, { backgroundColor: entry.color }]}
                    />
                    <Typography variant="subtitle1" fontWeight={600}>
                        {entry.value}
                    </Typography>
                    {entry.chip && <DeltaChip {...entry.chip} />}
                </Box>
            ))}
        </Box>
    );
};
