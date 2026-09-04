import { UseMutationResult } from 'react-query';

import { patchRequest, postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

import { AccountSettings } from '../../../planning/types/accountSettings';

export type SaveAccountSettingsPayload = {
    id?: number;
    focus_org_unit_type_id: number | null;
    intervention_org_unit_type_id: number | null;
    default_population_id: number | null;
};

// POST upserts the account's singleton row, so a missing id just means "create".
const saveAccountSettings = ({
    id,
    ...body
}: SaveAccountSettingsPayload): Promise<AccountSettings> =>
    id
        ? patchRequest(`/api/snt_malaria/account_settings/${id}/`, body)
        : postRequest(`/api/snt_malaria/account_settings/`, body);

export const useSaveAccountSettingsTab = (): UseMutationResult<
    AccountSettings,
    unknown,
    SaveAccountSettingsPayload
> =>
    useSnackMutation<AccountSettings, unknown, SaveAccountSettingsPayload>({
        mutationFn: saveAccountSettings,
        // Invalidate both query keys so the planning context and wizard stay fresh.
        invalidateQueryKey: ['accountSettings'],
    });
