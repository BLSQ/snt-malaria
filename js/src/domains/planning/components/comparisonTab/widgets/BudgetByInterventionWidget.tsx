import React, { FC } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { useGetInterventionCostBreakdownLineCategories } from '../../../../interventions/hooks/useGetInterventionCostBreakdownLineCategories';
import { MESSAGES } from '../../../../messages';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import { useInterventionCategoryColors } from '../../../hooks/useInterventionCategoryColors';
import {
    getSharedInterventionOrder,
    getSlotInterventionCosts,
} from '../../../libs/comparison-aggregation';
import { BudgetIntervention } from '../../../types/budget';
import { BudgetByInterventionOverlay } from './BudgetByInterventionOverlay';
import { BudgetByInterventionSideBySide } from './BudgetByInterventionSideBySide';

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
        return (
            <BudgetByInterventionOverlay
                title={title}
                slots={slots}
                interventionsBySlotIndex={interventionsBySlotIndex}
                isLoading={isLoading}
                currency={currency}
            />
        );
    }

    // Shared row order across slots (union of interventions, alphabetical),
    // so the same intervention lands on the same chart row in every slot
    // even when slots don't share the exact same intervention set. A slot
    // missing an intervention gets a zero-cost placeholder row rather than
    // skipping it, so the row still reserves its position -- unless the slot
    // has no data at all, in which case it's left empty so the chart falls
    // back to its own "no budget data" state instead of an all-empty grid.
    const sharedOrder = getSharedInterventionOrder(
        interventionsBySlotIndex.map(interventions =>
            interventions.map(intervention => ({
                interventionId: intervention.id,
                interventionLabel: intervention.type,
            })),
        ),
    );
    const alignedInterventionsBySlotIndex = interventionsBySlotIndex.map(
        interventions => {
            if (interventions.length === 0) {
                return interventions;
            }
            const byId = new Map(
                interventions.map(intervention => [
                    intervention.id,
                    intervention,
                ]),
            );
            return sharedOrder.map<BudgetIntervention>(
                ({ interventionId, interventionLabel }) =>
                    byId.get(interventionId) ?? {
                        id: interventionId,
                        type: interventionLabel,
                        code: '',
                        total_cost: 0,
                        cost_breakdown: [],
                    },
            );
        },
    );

    return (
        <BudgetByInterventionSideBySide
            title={title}
            slots={slots}
            interventionsBySlotIndex={alignedInterventionsBySlotIndex}
            colorsBySlotIndex={colorsBySlotIndex}
            costCategories={costCategories}
            isLoading={isLoading}
            currency={currency}
        />
    );
};
