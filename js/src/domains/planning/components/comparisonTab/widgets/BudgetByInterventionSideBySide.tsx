import React, { FC } from 'react';
import { VaccinesOutlined } from '@mui/icons-material';
import { SxStyles } from 'Iaso/types/general';
import { InterventionCategoryColors } from '../../../hooks/useInterventionCategoryColors';
import { BudgetIntervention } from '../../../types/budget';
import { ComparisonSlot } from '../types';
import {
    CostCategory,
    InterventionCostBarChart,
} from './InterventionCostBarChart';
import { SideBySideWidgetGrid } from './SideBySideWidgetGrid';

const CHART_HEIGHT = 320;

const styles = {
    chartBody: {
        height: CHART_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
    },
} satisfies SxStyles;

type Props = {
    title: string;
    slots: ComparisonSlot[];
    // Already aligned to a shared, alphabetical row order across slots (see
    // `BudgetByInterventionWidget`'s use of `getSharedInterventionOrder`), so
    // the same intervention lands on the same row in every slot's chart.
    interventionsBySlotIndex: BudgetIntervention[][];
    colorsBySlotIndex: InterventionCategoryColors[];
    costCategories: CostCategory[];
    isLoading: boolean;
    currency: string;
};

export const BudgetByInterventionSideBySide: FC<Props> = ({
    title,
    slots,
    interventionsBySlotIndex,
    colorsBySlotIndex,
    costCategories,
    isLoading,
    currency,
}) => (
    <SideBySideWidgetGrid
        slots={slots}
        title={title}
        icon={VaccinesOutlined}
        isLoading={isLoading}
        bodySx={styles.chartBody}
    >
        {(_slot, index) => (
            <InterventionCostBarChart
                interventions={interventionsBySlotIndex[index]}
                colorByInterventionId={
                    colorsBySlotIndex[index].colorByInterventionId
                }
                costCategories={costCategories}
                currency={currency}
                isLoading={isLoading}
            />
        )}
    </SideBySideWidgetGrid>
);
