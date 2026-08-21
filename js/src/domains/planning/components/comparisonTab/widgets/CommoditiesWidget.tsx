import React, { FC, useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../../messages';
import { useGetCostUnitTypes } from '../../../../settings/costUnits/hooks/useGetCostUnitTypes';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import { getSlotCommoditiesByIntervention } from '../../../libs/comparison-aggregation';
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

    const props = {
        title: formatMessage(MESSAGES.comparisonCommoditiesTitle),
        slots,
        commoditiesBySlotIndex,
        isBudgetLoading,
        currency,
    };

    return displayMode === 'overlay' ? (
        <CommoditiesOverlay {...props} />
    ) : (
        <CommoditiesSideBySide {...props} />
    );
};
