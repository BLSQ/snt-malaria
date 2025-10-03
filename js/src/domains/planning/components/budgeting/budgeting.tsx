import React, { FC, useMemo } from 'react';
import { Grid } from '@mui/material';
import { PaperContainer } from '../../../../components/styledComponents';
import { CostBreakdownChart } from './CostBreakdownChart';
import { ProportionChart } from './ProportionChart';

type Props = {
    budgets: any[];
};

export const Budgeting: FC<Props> = ({ budgets }) => {
    // TODO: We should have a year selector instead here
    const budgetInterventions = useMemo(
        () =>
            budgets?.length && budgets.length > 0
                ? budgets[0].interventions
                : [],
        [budgets],
    );

    return (
        <>
            <Grid item xs={12} md={7}>
                <PaperContainer>
                    <CostBreakdownChart
                        interventionBudgets={budgetInterventions}
                    />
                </PaperContainer>
            </Grid>
            <Grid item xs={12} md={5}>
                <PaperContainer>
                    <ProportionChart
                        interventionBudgets={budgetInterventions}
                    />
                </PaperContainer>
            </Grid>
        </>
    );
};
