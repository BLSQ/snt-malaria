import { UseQueryResult } from 'react-query';

import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';

export type BudgetSettings = {
    id: number;
    local_currency: string;
    exchange_rate: string;
    inflation_rate: string;
    buffer: string;
};

export const useGetBudgetSettings = (): UseQueryResult<
    BudgetSettings | undefined,
    Error
> =>
    useSnackQuery({
        queryKey: ['snt_malaria_budget_settings'],
        queryFn: () => getRequest('/api/snt_malaria/budget_settings/'),
        options: {
            // BudgetSettings has a OneToOneField to Account, so there's at
            // most one row per account; the API returns a list.
            select: (data: BudgetSettings[]) => (data ? data[0] : undefined),
        },
    });
