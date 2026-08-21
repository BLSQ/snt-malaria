import React, { FC } from 'react';
import { useChartTheme } from '../../../../../components/charts/chartTheme';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import {
    getSharedInterventionOrder,
    getSlotInterventionDistrictCoverage,
    InterventionDistrictCoverage,
} from '../../../libs/comparison-aggregation';
import { DistrictsCoveredOverlay } from './DistrictsCoveredOverlay';
import { DistrictsCoveredSideBySide } from './DistrictsCoveredSideBySide';

export const DistrictsCoveredWidget: FC = () => {
    const {
        slots,
        budgetsBySlotKey,
        isBudgetLoading,
        displayMode,
        totalDistrictCount,
    } = useScenarioComparisonContext();
    const { gridProps, axisProps } = useChartTheme();

    const coverageBySlotIndex = slots.map(slot =>
        getSlotInterventionDistrictCoverage(budgetsBySlotKey.get(slot.key)),
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
    const alignedCoverageBySlotIndex = coverageBySlotIndex.map(rows => {
        if (rows.length === 0) {
            return rows;
        }
        const byId = new Map(rows.map(row => [row.interventionId, row]));
        return sharedOrder.map<InterventionDistrictCoverage>(
            ({ interventionId, interventionLabel }) =>
                byId.get(interventionId) ?? {
                    interventionId,
                    interventionLabel,
                    districtCount: 0,
                },
        );
    });

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
