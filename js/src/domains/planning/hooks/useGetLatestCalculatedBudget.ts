import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { BudgetCalculationResponse } from '../types/budget';

export const useGetLatestCalculatedBudget = (
    scenarioId,
): UseQueryResult<BudgetCalculationResponse, Error> => {
    return useSnackQuery({
        queryKey: ['calculated_budget'],
        queryFn: () =>
            getRequest(
                `/api/snt_malaria/budgets/get_latest/?scenario_id=${scenarioId}`,
            ),
        options: {
            enabled: Boolean(scenarioId),
        },
        ignoreErrorCodes: [404],
    });
};
