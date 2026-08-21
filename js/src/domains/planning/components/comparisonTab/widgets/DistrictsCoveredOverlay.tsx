import React, { FC } from 'react';
import { PlaceOutlined } from '@mui/icons-material';
import { Grid } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { ChartTooltip } from '../../../../../components/charts/ChartTooltip';
import { WidgetCard } from '../../../../../components/WidgetCard';
import { MESSAGES } from '../../../../messages';
import {
    InterventionDistrictCoverage,
    mergeSlotRowsByIntervention,
} from '../../../libs/comparison-aggregation';
import { formatPercentValue, percentOfTotal } from '../../../libs/cost-utils';
import { ComparisonSlot } from '../types';
import { DistrictsRadarChart } from './DistrictsRadarChart';
import { OverlayGroupedBarChart } from './OverlayGroupedBarChart';

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

const percentOfTotal = (value: number, total?: number): string | undefined =>
    total ? formatPercentValue(value / total) : undefined;

type Props = {
    slots: ComparisonSlot[];
    coverageBySlotIndex: InterventionDistrictCoverage[][];
    isBudgetLoading: boolean;
    totalDistrictCount?: number;
};

export const DistrictsCoveredOverlay: FC<Props> = ({
    slots,
    coverageBySlotIndex,
    isBudgetLoading,
    totalDistrictCount,
}) => {
    const { formatMessage } = useSafeIntl();

    const countRowsBySlotKey = new Map(
        slots.map((slot, index) => [
            slot.key,
            coverageBySlotIndex[index].map(row => ({
                interventionId: row.interventionId,
                interventionLabel: row.interventionLabel,
                value: row.districtCount,
            })),
        ]),
    );
    const countRows = mergeSlotRowsByIntervention(countRowsBySlotKey);

    const percentRowsBySlotKey = new Map(
        slots.map((slot, index) => [
            slot.key,
            coverageBySlotIndex[index].map(row => ({
                interventionId: row.interventionId,
                interventionLabel: row.interventionLabel,
                value: totalDistrictCount
                    ? (row.districtCount / totalDistrictCount) * 100
                    : 0,
            })),
        ]),
    );
    const percentRows = mergeSlotRowsByIntervention(percentRowsBySlotKey);

    const renderCountTooltip = (row: (typeof countRows)[number]) => (
        <ChartTooltip
            title={row.interventionLabel}
            rows={slots.map(slot => {
                const count = row.valueBySlotKey[slot.key] ?? 0;
                const percent = percentOfTotal(count, totalDistrictCount);
                return {
                    label: slot.label,
                    value: percent ? `${count} (${percent})` : String(count),
                    color: slot.color,
                };
            })}
        />
    );

    return (
        <Grid container spacing={1} sx={{ flex: 1, minHeight: 0 }}>
            <Grid item xs={12} md={6} sx={{ height: '100%' }}>
                <WidgetCard
                    title={formatMessage(
                        MESSAGES.comparisonDistrictsCountTitle,
                    )}
                    icon={PlaceOutlined}
                    isLoading={isBudgetLoading}
                    bodySx={styles.chartBody}
                >
                    <OverlayGroupedBarChart
                        rows={countRows}
                        slots={slots}
                        valueFormatter={value => String(Math.round(value))}
                        emptyMessage={formatMessage(MESSAGES.noBudgetData)}
                        renderTooltip={renderCountTooltip}
                    />
                </WidgetCard>
            </Grid>
            <Grid item xs={12} md={6} sx={{ height: '100%' }}>
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
