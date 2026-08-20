import React, { FC } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { useGetInterventionCostBreakdownLineCategories } from '../../../../interventions/hooks/useGetInterventionCostBreakdownLineCategories';
import { MESSAGES } from '../../../../messages';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import { useInterventionCategoryColors } from '../../../hooks/useInterventionCategoryColors';
import { getSlotInterventionCosts } from '../../../libs/comparison-aggregation';
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

    return (
        <BudgetByInterventionSideBySide
            title={title}
            slots={slots}
            colorsBySlotIndex={colorsBySlotIndex}
            costCategories={costCategories}
            isLoading={isLoading}
            currency={currency}
        />
    );
};
