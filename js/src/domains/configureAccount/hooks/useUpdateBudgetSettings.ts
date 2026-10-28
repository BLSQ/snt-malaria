import { UseMutationResult } from 'react-query';

import { patchRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

import { BudgetSettings } from '../../../hooks/useGetBudgetSettings';
import { BUDGET_QUERY_KEYS } from '../../../constants/queryKeys';

export type UpdateBudgetSettingsPayload = {
    id: number;
    local_currency: string;
    exchange_rate: number | string;
    inflation_rate: number | string;
};

const updateBudgetSettings = ({
    id,
    ...body
}: UpdateBudgetSettingsPayload): Promise<BudgetSettings> =>
    patchRequest(`/api/snt_malaria/budget_settings/${id}/`, body);

export const useUpdateBudgetSettings = (): UseMutationResult<
    BudgetSettings,
    unknown,
    UpdateBudgetSettingsPayload
> =>
    useSnackMutation<BudgetSettings, unknown, UpdateBudgetSettingsPayload>({
        mutationFn: updateBudgetSettings,
        invalidateQueryKey: [
            ...BUDGET_QUERY_KEYS,
            'snt_malaria_budget_settings',
        ],
        ignoreErrorCodes: [400],
    });
