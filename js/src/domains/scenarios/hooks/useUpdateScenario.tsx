import { UseMutationResult } from 'react-query';
import { putRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { Scenario } from '../types';

export const useUpdateScenario = (
    scenarioId: number,
    onSuccess?: (data: any, variables: any, context: any) => void,
    onError?: (error: any, variables: any, context: any) => void,
): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: Scenario) =>
            putRequest(`/api/snt_malaria/scenarios/${scenarioId}/`, body),
        invalidateQueryKey: ['scenarios', `scenario_${scenarioId}`],
        options: {
            onSuccess,
            onError,
        },
    });
