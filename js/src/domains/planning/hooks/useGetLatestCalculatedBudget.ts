import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { BudgetCalculationResponse } from '../types/budget';

export const useGetLatestCalculatedBudget = (
    scenarioId: number | undefined,
): UseQueryResult<BudgetCalculationResponse, Error> => {
    return useSnackQuery({
        queryKey: ['calculated_budget', `calculated_budget_${scenarioId}`],
        queryFn: () =>
            getRequest(
                `/api/snt_malaria/budgets/get_latest/?scenario_id=${scenarioId}`,
            ),
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
            enabled: Boolean(scenarioId),
        },
        ignoreErrorCodes: [404],
    });
};
