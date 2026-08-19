import React, { FC } from 'react';
import { VaccinesOutlined } from '@mui/icons-material';
import { Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { ChartTooltip } from '../../../../../components/charts/ChartTooltip';
import { WidgetCard } from '../../../../../components/WidgetCard';
import { useGetInterventionCostBreakdownLineCategories } from '../../../../interventions/hooks/useGetInterventionCostBreakdownLineCategories';
import { MESSAGES } from '../../../../messages';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import { useInterventionCategoryColors } from '../../../hooks/useInterventionCategoryColors';
import {
    getSlotInterventionCosts,
    mergeSlotRowsByIntervention,
} from '../../../libs/comparison-aggregation';
import { formatBigNumber } from '../../../libs/cost-utils';
import { InterventionCostBarChart } from './InterventionCostBarChart';
import { OverlayGroupedBarChart } from './OverlayGroupedBarChart';

const CHART_HEIGHT = 320;

const styles = {
    chartBody: {
        height: CHART_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
    },
    sectionTitle: {
        fontWeight: 600,
        mb: 1,
    },
} satisfies SxStyles;

export const BudgetByInterventionWidget: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { slots, budgetsBySlotKey, isBudgetLoading, currency, displayMode } =
        useScenarioComparisonContext();
    const { data: costCategories = [], isLoading: isLoadingCategories } =
        useGetInterventionCostBreakdownLineCategories();

    const interventions0 = getSlotInterventionCosts(
        budgetsBySlotKey.get(slots[0]?.key ?? ''),
    );
    const interventions1 = getSlotInterventionCosts(
        budgetsBySlotKey.get(slots[1]?.key ?? ''),
    );
    const interventions2 = getSlotInterventionCosts(
        budgetsBySlotKey.get(slots[2]?.key ?? ''),
    );
    const interventionsBySlotIndex = [
        interventions0,
        interventions1,
        interventions2,
    ];

    const colors0 = useInterventionCategoryColors(interventions0);
    const colors1 = useInterventionCategoryColors(interventions1);
    const colors2 = useInterventionCategoryColors(interventions2);
    const colorsBySlotIndex = [colors0, colors1, colors2];

    const isLoading = isBudgetLoading || isLoadingCategories;

    if (displayMode === 'overlay') {
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
                title={formatMessage(MESSAGES.comparisonBudgetByInterventionTitle)}
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
    }

    return (
        <>
            <Typography variant="subtitle2" sx={styles.sectionTitle}>
                {formatMessage(MESSAGES.comparisonBudgetByInterventionTitle)}
            </Typography>
            <Grid container spacing={1} sx={{ flex: 1, minHeight: 0 }}>
                {slots.map((slot, index) => (
                    <Grid
                        item
                        xs={12}
                        md={12 / slots.length}
                        key={slot.key}
                        sx={{ height: '100%' }}
                    >
                        <WidgetCard
                            title={slot.label}
                            icon={VaccinesOutlined}
                            iconSx={{ color: slot.color }}
                            isLoading={isLoading}
                            bodySx={styles.chartBody}
                        >
                            <InterventionCostBarChart
                                interventions={
                                    colorsBySlotIndex[index]
                                        .orderedInterventions
                                }
                                colorByInterventionId={
                                    colorsBySlotIndex[index]
                                        .colorByInterventionId
                                }
                                costCategories={costCategories}
                                currency={currency}
                            />
                        </WidgetCard>
                    </Grid>
                ))}
            </Grid>
        </>
    );
};
