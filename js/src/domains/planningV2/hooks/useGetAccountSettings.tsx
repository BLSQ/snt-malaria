import { getRequest } from 'bluesquare-components';
import { UseQueryResult } from 'react-query';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { AccountSettings } from '../../planning/types/accountSettings';

export const useGetAccountSettings = (): UseQueryResult<
    AccountSettings,
    Error
> => {
    return useSnackQuery({
        queryKey: [`accountSettings`],
        queryFn: () => getRequest(`/api/snt_malaria/account_settings/`),
        options: {
            cacheTime: Infinity, // disable auto fetch on cache expiration
            select: (data: AccountSettings[]) => data?.[0] ?? {},
        },
    });
};
