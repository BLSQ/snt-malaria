import { UseMutationResult } from 'react-query';
import { patchRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { BudgetSettingsPayload } from '../types';
import { BUDGET_QUERY_KEYS } from '../../../../constants/queryKeys';

export const useSaveBudgetSettings = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: ({ id, ...body }: BudgetSettingsPayload) =>
            patchRequest(`/api/snt_malaria/budget_settings/${id}/`, body),
        invalidateQueryKey: [
            ...BUDGET_QUERY_KEYS,
            'snt_malaria_budget_settings',
        ],
    });
