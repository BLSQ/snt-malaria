import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { BudgetByGrantResponse } from '../types/budget';

export const useGetBudgetByGrant = (
    scenarioId?: number,
): UseQueryResult<BudgetByGrantResponse, Error> => {
    return useSnackQuery({
        queryKey: ['budget_by_grant', scenarioId],
        queryFn: () =>
            getRequest(
                `/api/snt_malaria/budgets/by_grant/?scenario_id=${scenarioId}`,
            ),
        options: {
            enabled: Boolean(scenarioId),
            retry: false,
            refetchOnWindowFocus: false,
        },
    });
};
