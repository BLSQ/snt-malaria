import React, { FC, useMemo } from 'react';
import { VaccinesOutlined } from '@mui/icons-material';
import { useSafeIntl } from 'bluesquare-components';
import { WidgetCard } from '../../../../components/WidgetCard';
import { useGetInterventionCostBreakdownLineCategories } from '../../../interventions/hooks/useGetInterventionCostBreakdownLineCategories';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { useInterventionCategoryColors } from '../../hooks/useInterventionCategoryColors';
import {
    aggregateInterventionCosts,
    aggregateOrgUnitCosts,
} from '../../libs/budget-aggregation';
import { InterventionCostBarChart } from '../comparisonTab/widgets/InterventionCostBarChart';

export const CostPerInterventionSummary: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { budgets, orgUnits, currency } = usePlanningContext();
    const { data: costCategories = [], isLoading } =
        useGetInterventionCostBreakdownLineCategories();

    const orgUnitIds = useMemo(
        () => new Set(orgUnits.map(ou => ou.id)),
        [orgUnits],
    );

    const interventions = useMemo(
        () =>
            aggregateInterventionCosts(
                aggregateOrgUnitCosts(budgets, orgUnitIds),
            ),
        [budgets, orgUnitIds],
    );

    const { orderedInterventions, colorByInterventionId } =
        useInterventionCategoryColors(interventions);

    return (
        <WidgetCard
            title={formatMessage(MESSAGES.costPerInterventionTitle)}
            icon={VaccinesOutlined}
            isLoading={isLoading}
            bodySx={{ display: 'flex', flexDirection: 'column' }}
        >
            <InterventionCostBarChart
                interventions={orderedInterventions}
                colorByInterventionId={colorByInterventionId}
                costCategories={costCategories}
                currency={currency}
            />
        </WidgetCard>
    );
};
