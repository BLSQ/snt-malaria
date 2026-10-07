import { UseMutationResult } from 'react-query';
import { patchRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { BudgetSettingsPayload } from '../types';

export const useSaveBudgetSettings = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: ({ id, ...body }: BudgetSettingsPayload) =>
            patchRequest(`/api/snt_malaria/budget_settings/${id}/`, body),
        invalidateQueryKey: ['snt_malaria_budget_settings'],
    });
