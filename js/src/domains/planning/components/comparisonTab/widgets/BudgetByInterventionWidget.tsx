import React, { FC, useMemo } from 'react';
import { VaccinesOutlined } from '@mui/icons-material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { ChartTooltip } from '../../../../../components/charts/ChartTooltip';
import { WidgetCard } from '../../../../../components/WidgetCard';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../../contexts/PlanningContext';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import { buildCategoryIdByInterventionId } from '../../../hooks/useInterventionCategoryColors';
import {
    getSharedInterventionOrderByCategory,
    getSlotInterventionCosts,
    mergeSlotRowsByIntervention,
} from '../../../libs/comparison-aggregation';
import { formatBigNumber } from '../../../libs/cost-utils';
import { SlotGroupedBarChart } from './SlotGroupedBarChart';

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
    const { slots, budgetsBySlotKey, isBudgetLoading, currency, orgUnitIds } =
        useScenarioComparisonContext();
    const { interventionCategories } = usePlanningContext();

    const categoryIdByInterventionId = useMemo(
        () => buildCategoryIdByInterventionId(interventionCategories),
        [interventionCategories],
    );

    const interventionsBySlotIndex = useMemo(
        () =>
            slots.map(slot =>
                getSlotInterventionCosts(
                    budgetsBySlotKey.get(slot.key),
                    orgUnitIds,
                ),
            ),
        [slots, budgetsBySlotKey, orgUnitIds],
    );

    // Order the merged chart's bar groups by intervention category (largest
    // cost first), so same-category interventions stay adjacent. The merge
    // itself already unions interventions across slots and zero-fills the
    // ones a slot lacks -- all we add here is that ordering, as an explicit
    // sort of the merged rows.
    const rows = useMemo(() => {
        const sharedOrder = getSharedInterventionOrderByCategory(
            interventionsBySlotIndex.map(interventions =>
                interventions.map(intervention => ({
                    interventionId: intervention.id,
                    interventionLabel: intervention.type,
                    cost: intervention.total_cost,
                })),
            ),
            categoryIdByInterventionId,
        );
        const orderIndexById = new Map(
            sharedOrder.map((identity, index) => [
                identity.interventionId,
                index,
            ]),
        );
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
        return mergeSlotRowsByIntervention(rowsBySlotKey).sort(
            (a, b) =>
                (orderIndexById.get(a.interventionId) ?? 0) -
                (orderIndexById.get(b.interventionId) ?? 0),
        );
    }, [interventionsBySlotIndex, categoryIdByInterventionId, slots]);

    const title = formatMessage(MESSAGES.comparisonBudgetByInterventionTitle);

    return (
        <WidgetCard
            title={title}
            icon={VaccinesOutlined}
            isLoading={isBudgetLoading}
            bodySx={styles.chartBody}
        >
            <SlotGroupedBarChart
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
