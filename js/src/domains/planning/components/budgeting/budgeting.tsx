import React, { FC, useMemo } from 'react';
import { Grid } from '@mui/material';
import { PaperContainer } from '../../../../components/styledComponents';
import { useGetBudget } from '../../hooks/useGetBudget';
import { InterventionPlanBudgetRequest } from '../../types/budget';
import { CostBreakdownChart } from './CostBreakdownChart';
import { ProportionChart } from './ProportionChart';

type Props = {
    interventionPlanMetrics?: InterventionPlanBudgetRequest[];
};

export const Budgeting: FC<Props> = ({ interventionPlanMetrics }) => {
    const { data: budget, isFetching: isFetchingBudget } = useGetBudget(
        interventionPlanMetrics,
    );

    const budgetInterventions = useMemo(
        () =>
            budget?.budgets?.length && budget.budgets.length > 0
                ? budget.budgets[0].interventions
                : [],
        [budget],
    );

    return (
        <>
            <Grid item xs={12} md={7}>
                <PaperContainer>
                    <CostBreakdownChart
                        isLoading={isFetchingBudget}
                        interventionBudgets={budgetInterventions}
                    />
                </PaperContainer>
            </Grid>
            <Grid item xs={12} md={5}>
                <PaperContainer>
                    <ProportionChart
                        isLoading={isFetchingBudget}
                        interventionBudgets={budgetInterventions}
                    />
                </PaperContainer>
            </Grid>
        </>
    );
};
