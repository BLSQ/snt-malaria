import React, { FC } from 'react';
import { Typography } from '@mui/material';
import { useGetBudget } from '../../hooks/useGetBudget';
import { InterventionPlanMetrics } from '../../types/budget';

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
            {budget?.budgets.interventions.map(i => (
                <Typography key={i.name}>
                    {i.name} {i.cost}
                </Typography>
            ))}
        </>
    );
};
