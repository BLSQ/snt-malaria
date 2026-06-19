import { UseMutationResult } from 'react-query';

import { patchRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

import { AccountSettings } from '../../planning/types/accountSettings';

export type UpdateAccountSettingsPayload = {
    id: number;
    focus_org_unit_type_id: number;
    intervention_org_unit_type_id: number;
};

const updateAccountSettings = ({
    id,
    ...body
}: UpdateAccountSettingsPayload): Promise<AccountSettings> =>
    patchRequest(`/api/snt_malaria/account_settings/${id}/`, body);

export const useUpdateAccountSettings = (): UseMutationResult<
    AccountSettings,
    unknown,
    UpdateAccountSettingsPayload
> =>
    useSnackMutation<AccountSettings, unknown, UpdateAccountSettingsPayload>({
        mutationFn: updateAccountSettings,
        invalidateQueryKey: ['snt_malaria_configureAccount_account_settings'],
        ignoreErrorCodes: [400],
    });
