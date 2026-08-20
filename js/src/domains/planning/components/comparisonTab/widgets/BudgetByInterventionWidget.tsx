import React, { FC } from 'react';
import { VaccinesOutlined } from '@mui/icons-material';
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
import { SideBySideWidgetGrid } from './SideBySideWidgetGrid';

const CHART_HEIGHT = 320;

const styles = {
    chartBody: {
        height: CHART_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
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

    // One hook per possible slot: the hook count can't vary with slot count.
    const colors0 = useInterventionCategoryColors(interventions0);
    const colors1 = useInterventionCategoryColors(interventions1);
    const colors2 = useInterventionCategoryColors(interventions2);
    const colorsBySlotIndex = [colors0, colors1, colors2];

    const isLoading = isBudgetLoading || isLoadingCategories;
    const title = formatMessage(MESSAGES.comparisonBudgetByInterventionTitle);

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
    }

    return (
        <SideBySideWidgetGrid
            slots={slots}
            title={title}
            icon={VaccinesOutlined}
            isLoading={isLoading}
            bodySx={styles.chartBody}
        >
            {(_slot, index) => (
                <InterventionCostBarChart
                    interventions={
                        colorsBySlotIndex[index].orderedInterventions
                    }
                    colorByInterventionId={
                        colorsBySlotIndex[index].colorByInterventionId
                    }
                    costCategories={costCategories}
                    currency={currency}
                />
            )}
        </SideBySideWidgetGrid>
    );
};
