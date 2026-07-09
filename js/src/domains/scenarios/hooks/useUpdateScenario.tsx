import { UseMutationResult } from 'react-query';
import { putRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { Scenario } from '../types';
import { ScenarioFormValues } from './useScenarioFormState';

export const useUpdateScenario = (
    scenarioId: number,
    onSuccess?: (data: Scenario, variables: any, context: any) => void,
    onError?: (error: any, variables: any, context: any) => void,
): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: ScenarioFormValues) =>
            putRequest(`/api/snt_malaria/scenarios/${scenarioId}/`, body),
        invalidateQueryKey: [
            'scenarios',
            `scenario_${scenarioId}`,
            'interventionAssignments',
            `interventionAssignments_${scenarioId}`,
            'calculated_budget',
            'impact',
            'budget_by_grant',
        ],
        options: {
            onSuccess,
            onError,
        },
    });
