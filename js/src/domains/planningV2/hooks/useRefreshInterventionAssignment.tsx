import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export const postRefreshAssignments = (scenarioId: number): Promise<any> =>
    postRequest(
        `/api/snt_malaria/scenarios/${scenarioId}/refresh_assignments/`,
        {
            scenario: scenarioId,
        },
    );

export const useRefreshAssignments = (scenarioId: number): UseMutationResult =>
    useSnackMutation({
        mutationFn: () => postRefreshAssignments(scenarioId),
        invalidateQueryKey: [
            'interventionAssignments',
            `interventionAssignments_${scenarioId}`,
        ],
    });
