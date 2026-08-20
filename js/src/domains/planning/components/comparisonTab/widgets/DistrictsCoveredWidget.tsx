import React, { FC } from 'react';
import { useChartTheme } from '../../../../../components/charts/chartTheme';
import { useScenarioComparisonContext } from '../../../contexts/ScenarioComparisonContext';
import { getSlotInterventionDistrictCoverage } from '../../../libs/comparison-aggregation';
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

    return (
        <DistrictsCoveredSideBySide
            slots={slots}
            coverageBySlotIndex={coverageBySlotIndex}
            isBudgetLoading={isBudgetLoading}
            totalDistrictCount={totalDistrictCount}
            gridProps={gridProps}
            axisProps={axisProps}
        />
    );
};
