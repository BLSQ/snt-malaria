import React, { FC, useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../../messages';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import {
    alignToSharedOrder,
    getSharedInterventionOrder,
    getSlotInterventionCoverage,
} from '../../../libs/comparison-aggregation';
import { PopulationCoverageOverlay } from './PopulationCoverageOverlay';
import { PopulationCoverageSideBySide } from './PopulationCoverageSideBySide';

export const PopulationCoverageWidget: FC = () => {
    const { formatMessage } = useSafeIntl();
    const {
        slots,
        budgetsBySlotKey,
        isBudgetLoading,
        displayMode,
        totalPopulation,
        populationYear,
    } = useScenarioComparisonContext();

    const coverageBySlotIndex = useMemo(
        () =>
            slots.map(slot =>
                getSlotInterventionCoverage(budgetsBySlotKey.get(slot.key)),
            ),
        [slots, budgetsBySlotKey],
    );

    const title = formatMessage(MESSAGES.comparisonPopulationCoverageTitle);
    const titleWithYear =
        populationYear != null ? `${title} (${populationYear})` : title;

    if (displayMode === 'overlay') {
        return (
            <PopulationCoverageOverlay
                title={titleWithYear}
                slots={slots}
                coverageBySlotIndex={coverageBySlotIndex}
                isBudgetLoading={isBudgetLoading}
                totalPopulation={totalPopulation}
            />
        );
    }

    const sharedOrder = getSharedInterventionOrder(coverageBySlotIndex);
    const alignedCoverageBySlotIndex = alignToSharedOrder(
        coverageBySlotIndex,
        sharedOrder,
        row => row.interventionId,
        ({ interventionId, interventionLabel }) => ({
            interventionId,
            interventionLabel,
            layers: [],
        }),
    );

    return (
        <PopulationCoverageSideBySide
            title={titleWithYear}
            slots={slots}
            coverageBySlotIndex={alignedCoverageBySlotIndex}
            isBudgetLoading={isBudgetLoading}
            totalPopulation={totalPopulation}
        />
    );
};
