import { UseMutationResult } from 'react-query';
import { deleteRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

const baseUrl = '/api/snt_malaria/interventionassignments/';

export const UseRemoveOrgUnitFromInterventionPlan = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (interventionAssignmentId: number) =>
            deleteRequest(`${baseUrl}${interventionAssignmentId}/`),
        invalidateQueryKey: ['interventionAssignments'],
    });

export const UseRemoveAllOrgUnitsFromInterventionPlan = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (interventionAssignmentIds: number[] | null) => {
            if (!interventionAssignmentIds) {
                return Promise.resolve([]);
            }

            const promises = interventionAssignmentIds.map(
                interventionAssignmentId =>
                    deleteRequest(`${baseUrl}${interventionAssignmentId}/`),
            );

            return Promise.all(promises);
        },
        invalidateQueryKey: ['interventionAssignments'],
    });
