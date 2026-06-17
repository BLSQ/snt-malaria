import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { UseQueryResult } from 'react-query';
import { BudgetSettings } from '../types';

export const useGetBudgetSettings = (): UseQueryResult<
    BudgetSettings | undefined,
    Error
> =>
    useSnackQuery({
        queryKey: ['budgetSettings'],
        queryFn: () => getRequest('/api/snt_malaria/budget_settings/'),
        options: {
            // BudgetSettings has a OneToOneField to Account, so there's at
            // most one row per account; the API returns a list.
            select: (data: BudgetSettings[]) => (data ? data[0] : undefined),
        },
    });
