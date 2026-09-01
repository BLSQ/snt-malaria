import React, { FC, useMemo } from 'react';
import { GroupsOutlined } from '@mui/icons-material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../../messages';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import {
    getSlotInterventionCoverage,
    mergeCoverageRowsBySlot,
} from '../../../libs/comparison-aggregation';
import {
    formatBigNumber,
    formatPercentValue,
    percentOfTotal,
} from '../../../libs/cost-utils';
import { SlotComparisonRow, SlotComparisonTable } from './SlotComparisonTable';

export const PopulationCoverageWidget: FC = () => {
    const { formatMessage } = useSafeIntl();
    const {
        slots,
        budgetsBySlotKey,
        isBudgetLoading,
        totalPopulation,
        populationYear,
    } = useScenarioComparisonContext();

    const rows = useMemo<SlotComparisonRow[]>(() => {
        const coverageBySlotKey = new Map(
            slots.map(slot => [
                slot.key,
                getSlotInterventionCoverage(budgetsBySlotKey.get(slot.key)),
            ]),
        );
        return mergeCoverageRowsBySlot(coverageBySlotKey).map(row => ({
            key: `${row.interventionId}-${row.layerId}`,
            interventionLabel: row.interventionLabel,
            subLabel: row.layerName,
            cellsBySlotKey: Object.fromEntries(
                slots.map(slot => {
                    const cell = row.cellBySlotKey[slot.key];
                    return [
                        slot.key,
                        [
                            cell ? formatBigNumber(cell.personsAtRisk) : '-',
                            cell
                                ? formatPercentValue(cell.percentEligible)
                                : '-',
                            cell
                                ? (percentOfTotal(
                                      cell.personsAtRisk,
                                      totalPopulation,
                                  ) ?? '-')
                                : '-',
                        ],
                    ];
                }),
            ),
        }));
    }, [slots, budgetsBySlotKey, totalPopulation]);

    const title = formatMessage(MESSAGES.comparisonPopulationCoverageTitle);
    const titleWithYear =
        populationYear != null ? `${title} (${populationYear})` : title;

    return (
        <SlotComparisonTable
            title={titleWithYear}
            icon={GroupsOutlined}
            isLoading={isBudgetLoading}
            slots={slots}
            subColumnLabel={formatMessage(
                MESSAGES.comparisonPopulationLayerLabel,
            )}
            perSlotColumnLabels={[
                formatMessage(MESSAGES.comparisonPersonsAtRisk),
                formatMessage(MESSAGES.comparisonPercentEligible),
                formatMessage(MESSAGES.comparisonPercentTotalPop),
            ]}
            rows={rows}
            emptyMessage={formatMessage(MESSAGES.noBudgetData)}
        />
    );
};
