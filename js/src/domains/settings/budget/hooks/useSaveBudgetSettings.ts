import { UseMutationResult } from 'react-query';
import { patchRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { BudgetSettingsPayload } from '../types';

export const useSaveBudgetSettings = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: ({ id, ...body }: BudgetSettingsPayload) =>
            patchRequest(`/api/snt_malaria/budget_settings/${id}/`, body),
        // Also refresh the copies used by intervention settings and the
        // account configuration wizard.
        invalidateQueryKey: [
            'budgetSettings',
            'snt_malaria_configureAccount_budget_settings',
        ],
    });
