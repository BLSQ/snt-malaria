import { UseMutationResult } from 'react-query';
import { putRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { Scenario } from '../types';
import { ScenarioFormValues } from './useScenarioFormState';
import { BUDGET_QUERY_KEYS } from '../../../constants/queryKeys';

export const useUpdateScenario = (
    scenarioId: number,
    onSuccess?: (data: Scenario, variables: any, context: any) => void,
    onError?: (error: any, variables: any, context: any) => void,
): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: ScenarioFormValues) =>
            putRequest(`/api/snt_malaria/scenarios/${scenarioId}/`, body),
        invalidateQueryKey: [
            ...BUDGET_QUERY_KEYS,
            'scenarios',
            `scenario_${scenarioId}`,
            'interventionAssignments',
            `interventionAssignments_${scenarioId}`,
            'impact',
        ],
        options: {
            onSuccess,
            onError,
        },
    });
