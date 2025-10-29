import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { BudgetCalculationResponse } from '../types/budget';

export const useGetLatestCalculatedBudget = (
    scenarioId,
): UseQueryResult<BudgetCalculationResponse, Error> => {
    return useSnackQuery({
        queryKey: ['calculated_budget', scenarioId],
        queryFn: () =>
            getRequest(
                `/api/snt_malaria/budgets/get_latest/?scenario_id=${scenarioId}`,
            ),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
            select: (data: BudgetCalculationResponse) => {
                return data;
            },
            enabled: Boolean(scenarioId),
        },
        ignoreErrorCodes: [404],
    });
};
