import React, { FC } from 'react';
import { VaccinesOutlined } from '@mui/icons-material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { ChartTooltip } from '../../../../../components/charts/ChartTooltip';
import { WidgetCard } from '../../../../../components/WidgetCard';
import { MESSAGES } from '../../../../messages';
import { mergeSlotRowsByIntervention } from '../../../libs/comparison-aggregation';
import { formatBigNumber } from '../../../libs/cost-utils';
import { BudgetIntervention } from '../../../types/budget';
import { ComparisonSlot } from '../types';
import { OverlayGroupedBarChart } from './OverlayGroupedBarChart';

const CHART_HEIGHT = 320;

const styles = {
    chartBody: {
        height: CHART_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
    },
} satisfies SxStyles;

type Props = {
    title: string;
    slots: ComparisonSlot[];
    interventionsBySlotIndex: BudgetIntervention[][];
    isLoading: boolean;
    currency: string;
};

export const BudgetByInterventionOverlay: FC<Props> = ({
    title,
    slots,
    interventionsBySlotIndex,
    isLoading,
    currency,
}) => {
    const { formatMessage } = useSafeIntl();

    const rowsBySlotKey = new Map(
        slots.map((slot, index) => [
            slot.key,
            interventionsBySlotIndex[index].map(intervention => ({
                interventionId: intervention.id,
                interventionLabel: intervention.type,
                value: intervention.total_cost,
            })),
        ]),
    );
    const rows = mergeSlotRowsByIntervention(rowsBySlotKey);

    return (
        <WidgetCard
            title={title}
            icon={VaccinesOutlined}
            isLoading={isLoading}
            bodySx={styles.chartBody}
        >
            <OverlayGroupedBarChart
                rows={rows}
                slots={slots}
                valueFormatter={value => formatBigNumber(value, currency)}
                emptyMessage={formatMessage(MESSAGES.noBudgetData)}
                renderTooltip={row => (
                    <ChartTooltip
                        title={row.interventionLabel}
                        rows={slots.map(slot => ({
                            label: slot.label,
                            value: formatBigNumber(
                                row.valueBySlotKey[slot.key] ?? 0,
                                currency,
                            ),
                            color: slot.color,
                        }))}
                    />
                )}
            />
        </WidgetCard>
    );
};
