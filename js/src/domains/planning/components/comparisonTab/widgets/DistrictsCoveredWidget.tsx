import React, { FC, useMemo } from 'react';
import { useChartTheme } from '../../../../../components/charts/chartTheme';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import {
    alignToSharedOrder,
    getSharedInterventionOrder,
    getSlotInterventionDistrictCoverage,
} from '../../../libs/comparison-aggregation';
import { DistrictsCoveredOverlay } from './DistrictsCoveredOverlay';
import { DistrictsCoveredSideBySide } from './DistrictsCoveredSideBySide';

export const DistrictsCoveredWidget: FC = () => {
    const {
        slots,
        budgetsBySlotKey,
        isBudgetLoading,
        displayMode,
        orgUnitIds,
        totalDistrictCount,
    } = useScenarioComparisonContext();
    const { gridProps, axisProps } = useChartTheme();

    const coverageBySlotIndex = useMemo(
        () =>
            slots.map(slot =>
                getSlotInterventionDistrictCoverage(
                    budgetsBySlotKey.get(slot.key),
                    orgUnitIds,
                ),
            ),
        [slots, budgetsBySlotKey, orgUnitIds],
    );

    if (displayMode === 'overlay') {
        return (
            <DistrictsCoveredOverlay
                slots={slots}
                coverageBySlotIndex={coverageBySlotIndex}
                isBudgetLoading={isBudgetLoading}
                totalDistrictCount={totalDistrictCount}
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
            districtCount: 0,
        }),
    );

    return (
        <DistrictsCoveredSideBySide
            slots={slots}
            coverageBySlotIndex={alignedCoverageBySlotIndex}
            isBudgetLoading={isBudgetLoading}
            totalDistrictCount={totalDistrictCount}
            gridProps={gridProps}
            axisProps={axisProps}
        />
    );
};
