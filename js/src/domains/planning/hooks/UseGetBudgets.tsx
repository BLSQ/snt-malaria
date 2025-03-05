import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { makeUrlWithParams } from 'Iaso/libs/utils';
import { Budget } from '../types/interventions';

export const UseGetBudgets = (scenarioId): UseQueryResult<Budget[], Error> => {
    const params: Record<string, any> = {
        scenario_id: scenarioId,
    };
    const url = makeUrlWithParams(
        '/api/snt_malaria/interventionassignment/budget_per_org_unit/',
        params,
    );

    return useSnackQuery({
        queryKey: ['budgets', scenarioId],
        queryFn: () => getRequest(url),
        options: {
            staleTime: 1000 * 60 * 15,
            cacheTime: 1000 * 60 * 5,
            select: (data: Budget[]) => {
                return data;
            },
            enabled: Boolean(scenarioId),
        },
    });
};
