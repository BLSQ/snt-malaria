import { UseQueryResult } from 'react-query';

import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';

export type BudgetSettings = {
    id: number;
    local_currency: string;
    exchange_rate: string;
    inflation_rate: string;
};

export const useGetBudgetSettings = (
    enabled: boolean = true,
): UseQueryResult<BudgetSettings, Error> =>
    useSnackQuery({
        queryKey: ['snt_malaria_configureAccount_budget_settings'],
        queryFn: () => getRequest('/api/snt_malaria/budget_settings/'),
        options: {
            enabled,
            // The API returns a list scoped to the user's account; the
            // singleton row sits at index 0 - or undefined if none was seeded.
            select: (data: BudgetSettings[]) =>
                data?.[0] ?? ({} as BudgetSettings),
        },
    });
