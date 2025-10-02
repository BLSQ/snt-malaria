import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export const postCalculateBudget = (scenarioId: number) =>
    postRequest(
        `/api/snt_malaria/scenarios/${scenarioId}/calculate_budget/`,
        {},
    );

export const useCalculateBudget = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: postCalculateBudget,
    });
