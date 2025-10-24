import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { BudgetCalculationResponse } from '../types/budget';

export const postCalculateBudget = (
    scenarioId: number,
): Promise<BudgetCalculationResponse> =>
    postRequest(`/api/snt_malaria/budgets/?scenario_id=${scenarioId}`, {
        scenario: scenarioId,
    });

export const useCalculateBudget = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: postCalculateBudget,
    });
