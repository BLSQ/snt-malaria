import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { BudgetAssumptions } from '../types/interventions';

const transformResponse = (budgetAssumptions: BudgetAssumptions) => ({
    ...budgetAssumptions,
    coverage: budgetAssumptions.coverage && budgetAssumptions.coverage * 100,
});

export const useGetBudgetAssumptions = (
    scenarioId: number,
): UseQueryResult<BudgetAssumptions[], Error> => {
    return useSnackQuery({
        queryKey: ['budget_assumptions', scenarioId],
        queryFn: () => {
            return getRequest(
                `/api/snt_malaria/budget_assumptions/?scenario=${scenarioId}`,
            );
        },
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
            select: (data: BudgetAssumptions[]) =>
                data.map(d => transformResponse(d)),
        },
    });
};
