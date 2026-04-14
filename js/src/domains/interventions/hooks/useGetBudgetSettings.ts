import { getRequest } from 'bluesquare-components';
import { UseQueryResult } from 'react-query';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { BudgetSettings } from '../types';

export const useGetBudgetSettings = (): UseQueryResult<
    BudgetSettings | undefined,
    Error
> =>
    useSnackQuery({
        queryKey: ['budgetSettings'],
        queryFn: () => getRequest('/api/snt_malaria/budget_settings/'),
        options: {
            select: (data: BudgetSettings[]) => (data ? data[0] : undefined),
            staleTime: Infinity, // in MS
            refetchOnWindowFocus: false, // This is only needed with staleTime set
            cacheTime: Infinity, // disable auto fetch on cache expiration
        },
    });
