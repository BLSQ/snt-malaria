import React, { FC, useCallback, useMemo } from 'react';
import { PlaceOutlined } from '@mui/icons-material';
import { Grid } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { ChartTooltip } from '../../../../../components/charts/ChartTooltip';
import { WidgetCard } from '../../../../../components/WidgetCard';
import { MESSAGES } from '../../../../messages';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import {
    getSlotInterventionDistrictCoverage,
    mergeSlotRowsByIntervention,
} from '../../../libs/comparison-aggregation';
import { formatPercentValue, percentOfTotal } from '../../../libs/cost-utils';
import { MergedInterventionRow } from '../../../types/comparisonAggregation';
import { DistrictsRadarChart } from './DistrictsRadarChart';
import { SlotGroupedBarChart } from './SlotGroupedBarChart';

const CHART_HEIGHT = 280;

const styles = {
    grid: {
        flex: 1,
        minHeight: 0,
    },
    gridItem: {
        height: '100%',
    },
    chartBody: {
        height: CHART_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
    },
} satisfies SxStyles;

export const DistrictsCoveredWidget: FC = () => {
    const { formatMessage } = useSafeIntl();
    const {
        slots,
        budgetsBySlotKey,
        isBudgetLoading,
        orgUnitIds,
        totalDistrictCount,
    } = useScenarioComparisonContext();

    const { countRows, percentRows } = useMemo(() => {
        const countRowsBySlotKey = new Map(
            slots.map(slot => [
                slot.key,
                getSlotInterventionDistrictCoverage(
                    budgetsBySlotKey.get(slot.key),
                    orgUnitIds,
                ).map(row => ({
                    interventionId: row.interventionId,
                    interventionLabel: row.interventionLabel,
                    value: row.districtCount,
                })),
            ]),
        );
        const merged = mergeSlotRowsByIntervention(countRowsBySlotKey);
        const asPercent = merged.map(row => ({
            ...row,
            valueBySlotKey: Object.fromEntries(
                Object.entries(row.valueBySlotKey).map(([slotKey, count]) => [
                    slotKey,
                    totalDistrictCount ? (count / totalDistrictCount) * 100 : 0,
                ]),
            ),
        }));
        return { countRows: merged, percentRows: asPercent };
    }, [slots, budgetsBySlotKey, orgUnitIds, totalDistrictCount]);

    const renderCountTooltip = useCallback(
        (row: MergedInterventionRow) => (
            <ChartTooltip
                title={row.interventionLabel}
                rows={slots.map(slot => {
                    const count = row.valueBySlotKey[slot.key] ?? 0;
                    const percent = percentOfTotal(count, totalDistrictCount);
                    return {
                        label: slot.label,
                        value: percent
                            ? `${count} (${percent})`
                            : String(count),
                        color: slot.color,
                    };
                })}
            />
        ),
        [slots, totalDistrictCount],
    );

    return (
        <Grid container spacing={1} sx={styles.grid}>
            <Grid item xs={12} md={6} sx={styles.gridItem}>
                <WidgetCard
                    title={formatMessage(
                        MESSAGES.comparisonDistrictsCountTitle,
                    )}
                    icon={PlaceOutlined}
                    isLoading={isBudgetLoading}
                    bodySx={styles.chartBody}
                >
                    <SlotGroupedBarChart
                        rows={countRows}
                        slots={slots}
                        valueFormatter={value => String(Math.round(value))}
                        emptyMessage={formatMessage(MESSAGES.noBudgetData)}
                        renderTooltip={renderCountTooltip}
                    />
                </WidgetCard>
            </Grid>
            <Grid item xs={12} md={6} sx={styles.gridItem}>
                <WidgetCard
                    title={formatMessage(
                        MESSAGES.comparisonDistrictsPercentTitle,
                    )}
                    icon={PlaceOutlined}
                    isLoading={isBudgetLoading}
                    bodySx={styles.chartBody}
                >
                    <DistrictsRadarChart
                        rows={percentRows}
                        slots={slots}
                        emptyMessage={formatMessage(MESSAGES.noBudgetData)}
                        renderTooltip={row => (
                            <ChartTooltip
                                title={row.interventionLabel}
                                rows={slots.map(slot => ({
                                    label: slot.label,
                                    value: `${formatPercentValue((row.valueBySlotKey[slot.key] ?? 0) / 100)}`,
                                    color: slot.color,
                                }))}
                            />
                        )}
                    />
                </WidgetCard>
            </Grid>
        </Grid>
    );
};
