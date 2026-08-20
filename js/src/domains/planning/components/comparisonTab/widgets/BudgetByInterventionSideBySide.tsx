import React, { FC } from 'react';
import { VaccinesOutlined } from '@mui/icons-material';
import { SxStyles } from 'Iaso/types/general';
import { InterventionCategoryColors } from '../../../hooks/useInterventionCategoryColors';
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
    colorsBySlotIndex: InterventionCategoryColors[];
    costCategories: CostCategory[];
    isLoading: boolean;
    currency: string;
};

export const BudgetByInterventionSideBySide: FC<Props> = ({
    title,
    slots,
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
                interventions={colorsBySlotIndex[index].orderedInterventions}
                colorByInterventionId={
                    colorsBySlotIndex[index].colorByInterventionId
                }
                costCategories={costCategories}
                currency={currency}
            />
        )}
    </SideBySideWidgetGrid>
);
