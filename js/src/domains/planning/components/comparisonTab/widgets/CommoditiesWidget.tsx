import React, { FC, useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../../messages';
import { useGetCostUnitTypes } from '../../../../settings/costUnits/hooks/useGetCostUnitTypes';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import {
    alignToSharedOrder,
    getSharedInterventionOrder,
    getSlotCommoditiesByIntervention,
} from '../../../libs/comparison-aggregation';
import { CommoditiesOverlay } from './CommoditiesOverlay';
import { CommoditiesSideBySide } from './CommoditiesSideBySide';

export const CommoditiesWidget: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { slots, budgetsBySlotKey, isBudgetLoading, currency, displayMode } =
        useScenarioComparisonContext();
    const { data: costUnitTypes } = useGetCostUnitTypes();

    const commodityUnitNames = useMemo(
        () =>
            new Set(
                (costUnitTypes ?? [])
                    .filter(unit => unit.is_commodity)
                    .map(unit => unit.name),
            ),
        [costUnitTypes],
    );

    const commoditiesBySlotIndex = useMemo(
        () =>
            slots.map(slot =>
                getSlotCommoditiesByIntervention(
                    budgetsBySlotKey.get(slot.key),
                    commodityUnitNames,
                ),
            ),
        [slots, budgetsBySlotKey, commodityUnitNames],
    );

    const title = formatMessage(MESSAGES.comparisonCommoditiesTitle);

    if (displayMode === 'overlay') {
        return (
            <CommoditiesOverlay
                title={title}
                slots={slots}
                commoditiesBySlotIndex={commoditiesBySlotIndex}
                isBudgetLoading={isBudgetLoading}
                currency={currency}
            />
        );
    }

    const sharedOrder = getSharedInterventionOrder(commoditiesBySlotIndex);
    const alignedCommoditiesBySlotIndex = alignToSharedOrder(
        commoditiesBySlotIndex,
        sharedOrder,
        row => row.interventionId,
        ({ interventionId, interventionLabel }) => ({
            interventionId,
            interventionLabel,
            commodities: [],
        }),
    );

    return (
        <CommoditiesSideBySide
            title={title}
            slots={slots}
            commoditiesBySlotIndex={alignedCommoditiesBySlotIndex}
            isBudgetLoading={isBudgetLoading}
            currency={currency}
        />
    );
};
