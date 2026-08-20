import React, { FC } from 'react';
import { GroupsOutlined } from '@mui/icons-material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { ChartTooltip } from '../../../../../components/charts/ChartTooltip';
import { WidgetCard } from '../../../../../components/WidgetCard';
import { MESSAGES } from '../../../../messages';
import {
    InterventionCoverage,
    mergeSlotRowsByIntervention,
} from '../../../libs/comparison-aggregation';
import { formatBigNumber, formatPercentValue } from '../../../libs/cost-utils';
import { ComparisonSlot } from '../types';
import { OverlayGroupedBarChart } from './OverlayGroupedBarChart';

const CHART_HEIGHT = 320;

const styles = {
    body: {
        height: CHART_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
    },
} satisfies SxStyles;

const percentOfTotal = (value: number, total?: number): string | undefined =>
    total ? formatPercentValue(value / total) : undefined;

type Props = {
    title: string;
    slots: ComparisonSlot[];
    coverageBySlotIndex: InterventionCoverage[][];
    isBudgetLoading: boolean;
    totalPopulation?: number;
};

export const PopulationCoverageOverlay: FC<Props> = ({
    title,
    slots,
    coverageBySlotIndex,
    isBudgetLoading,
    totalPopulation,
}) => {
    const { formatMessage } = useSafeIntl();

    const rowsBySlotKey = new Map(
        slots.map((slot, index) => [
            slot.key,
            coverageBySlotIndex[index].map(row => ({
                interventionId: row.interventionId,
                interventionLabel: row.interventionLabel,
                value: row.personsAtRisk,
            })),
        ]),
    );
    const rows = mergeSlotRowsByIntervention(rowsBySlotKey);
    const coverageBySlotKeyByIntervention = new Map(
        rows.map(row => [
            row.interventionId,
            new Map(
                slots.map((slot, index) => [
                    slot.key,
                    coverageBySlotIndex[index].find(
                        r => r.interventionId === row.interventionId,
                    ),
                ]),
            ),
        ]),
    );

    return (
        <WidgetCard
            title={title}
            icon={GroupsOutlined}
            isLoading={isBudgetLoading}
            bodySx={styles.body}
        >
            <OverlayGroupedBarChart
                rows={rows}
                slots={slots}
                valueFormatter={value => formatBigNumber(value)}
                emptyMessage={formatMessage(MESSAGES.noBudgetData)}
                renderTooltip={row => {
                    const bySlotKey =
                        coverageBySlotKeyByIntervention.get(
                            row.interventionId,
                        ) ?? new Map();
                    return (
                        <ChartTooltip
                            title={row.interventionLabel}
                            rows={slots.map(slot => {
                                const coverage = bySlotKey.get(slot.key);
                                const percentTotal = coverage
                                    ? percentOfTotal(
                                          coverage.personsAtRisk,
                                          totalPopulation,
                                      )
                                    : undefined;
                                const parts = [
                                    formatMessage(
                                        MESSAGES.comparisonPersonsAtRisk,
                                    ),
                                    coverage
                                        ? formatBigNumber(
                                              coverage.personsAtRisk,
                                          )
                                        : '-',
                                ];
                                if (coverage) {
                                    parts.push(
                                        `${formatMessage(MESSAGES.comparisonPercentEligible)} ${formatPercentValue(coverage.percentEligible)}`,
                                    );
                                }
                                if (percentTotal) {
                                    parts.push(
                                        `${formatMessage(MESSAGES.comparisonPercentTotalPop)} ${percentTotal}`,
                                    );
                                }
                                return {
                                    label: slot.label,
                                    value: parts.join(' · '),
                                    color: slot.color,
                                };
                            })}
                        />
                    );
                }}
            />
        </WidgetCard>
    );
};
