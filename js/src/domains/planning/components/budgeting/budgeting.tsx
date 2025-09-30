import React, { FC } from 'react';
import { Grid } from '@mui/material';
import { PaperContainer } from '../../../../components/styledComponents';
import { useGetBudget } from '../../hooks/useGetBudget';
import { InterventionPlanMetrics } from '../../types/budget';
import { CostBreakdownChart } from './CostBreakdownChart';
import { ProportionChart } from './ProportionChart';

type Props = {
    interventionPlanMetrics?: InterventionPlanMetrics[];
};

export const Budgeting: FC<Props> = ({ interventionPlanMetrics }) => {
    const { data: budget, isFetching: isFetchingBudget } = useGetBudget(
        interventionPlanMetrics,
    );
    console.log(budget);
    return (
        <>
            <Grid item xs={12} md={7}>
                <PaperContainer>
                    <CostBreakdownChart
                        isLoading={isFetchingBudget}
                        interventionBudgets={
                            budget?.budgets?.interventions ?? []
                        }
                    />
                </PaperContainer>
            </Grid>
            <Grid item xs={12} md={5}>
                <PaperContainer>
                    <ProportionChart
                        isLoading={isFetchingBudget}
                        interventionBudgets={
                            budget?.budgets?.interventions ?? []
                        }
                    />
                </PaperContainer>
            </Grid>
        </>
    );
};
