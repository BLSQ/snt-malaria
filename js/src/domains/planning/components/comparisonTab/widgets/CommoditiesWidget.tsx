import React, { FC } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../../messages';
import { useGetCostUnitTypes } from '../../../../settings/costUnits/hooks/useGetCostUnitTypes';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import { CommoditiesOverlay } from './CommoditiesOverlay';
import { CommoditiesSideBySide } from './CommoditiesSideBySide';

export const CommoditiesWidget: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { slots, budgetsBySlotKey, isBudgetLoading, currency, displayMode } =
        useScenarioComparisonContext();
    const { data: costUnitTypes } = useGetCostUnitTypes();

    const commodityUnitNames = new Set(
        (costUnitTypes ?? [])
            .filter(unit => unit.is_commodity)
            .map(unit => unit.name),
    );

    const props = {
        title: formatMessage(MESSAGES.comparisonCommoditiesTitle),
        slots,
        budgetsBySlotKey,
        isBudgetLoading,
        currency,
        commodityUnitNames,
    };

    return displayMode === 'overlay' ? (
        <CommoditiesOverlay {...props} />
    ) : (
        <CommoditiesSideBySide {...props} />
    );
};
