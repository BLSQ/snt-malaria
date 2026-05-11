import { UseQueryResult } from 'react-query';

import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';

import { AccountSettings } from '../../planning/types/accountSettings';

export const useGetAccountSettings = (
    enabled: boolean,
): UseQueryResult<AccountSettings, Error> =>
    useSnackQuery({
        queryKey: ['snt_malaria_configureAccount_account_settings'],
        queryFn: () => getRequest('/api/snt_malaria/account_settings/'),
        options: {
            enabled,
            // The API returns a list (filtered to the user's account); the
            // singleton row is at index 0 - or undefined if none was created.
            select: (data: AccountSettings[]) =>
                data?.[0] ?? ({} as AccountSettings),
        },
    });
