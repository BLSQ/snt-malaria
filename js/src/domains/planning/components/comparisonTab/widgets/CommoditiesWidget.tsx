import React, { FC, useMemo } from 'react';
import { Inventory2Outlined } from '@mui/icons-material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../../messages';
import { useGetCostUnitTypes } from '../../../../settings/costUnits/hooks/useGetCostUnitTypes';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import {
    getSlotCommoditiesByIntervention,
    mergeCommodityRowsBySlot,
} from '../../../libs/comparison-aggregation';
import { formatBigNumber, formatQuantity } from '../../../libs/cost-utils';
import { SlotComparisonRow, SlotComparisonTable } from './SlotComparisonTable';

export const CommoditiesWidget: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { slots, budgetsBySlotKey, isBudgetLoading, currency } =
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

    const rows = useMemo<SlotComparisonRow[]>(() => {
        const commoditiesBySlotKey = new Map(
            slots.map(slot => [
                slot.key,
                getSlotCommoditiesByIntervention(
                    budgetsBySlotKey.get(slot.key),
                    commodityUnitNames,
                ),
            ]),
        );
        return mergeCommodityRowsBySlot(commoditiesBySlotKey).map(row => ({
            key: `${row.interventionId}-${row.unitName}`,
            interventionLabel: row.interventionLabel,
            subLabel: row.unitName,
            cellsBySlotKey: Object.fromEntries(
                slots.map(slot => {
                    const cell = row.cellBySlotKey[slot.key];
                    return [
                        slot.key,
                        [
                            cell ? formatQuantity(cell.quantity) : '-',
                            cell?.unitCost != null
                                ? formatBigNumber(cell.unitCost, currency)
                                : '-',
                            cell
                                ? formatBigNumber(cell.totalCost, currency)
                                : '-',
                        ],
                    ];
                }),
            ),
        }));
    }, [slots, budgetsBySlotKey, commodityUnitNames, currency]);

    return (
        <SlotComparisonTable
            title={formatMessage(MESSAGES.comparisonCommoditiesTitle)}
            icon={Inventory2Outlined}
            isLoading={isBudgetLoading}
            slots={slots}
            subColumnLabel={formatMessage(MESSAGES.comparisonCommodityLabel)}
            perSlotColumnLabels={[
                formatMessage(MESSAGES.comparisonQuantityLabel),
                formatMessage(MESSAGES.budgetingCostLineUnitCost),
                formatMessage(MESSAGES.comparisonTotalCostColumnLabel),
            ]}
            rows={rows}
            emptyMessage={formatMessage(MESSAGES.noBudgetData)}
        />
    );
};
