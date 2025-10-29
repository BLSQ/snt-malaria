import { UseMutationResult } from 'react-query';
import { deleteRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

const baseUrl = '/api/snt_malaria/intervention_assignments/';

export const useRemoveOrgUnitFromInterventionPlan = ({
    showSuccessSnackBar = true,
}: { showSuccessSnackBar?: boolean } = {}): UseMutationResult =>
    useSnackMutation({
        mutationFn: (interventionAssignmentId: number) =>
            deleteRequest(`${baseUrl}${interventionAssignmentId}/`),
        invalidateQueryKey: ['interventionAssignments'],
        showSuccessSnackBar,
    });

export const useRemoveManyOrgUnitsFromInterventionPlan =
    (): UseMutationResult =>
        useSnackMutation({
            mutationFn: (interventionAssignmentIds: number[] | null) => {
                if (
                    !interventionAssignmentIds ||
                    interventionAssignmentIds.length === 0
                ) {
                    return Promise.resolve(true);
                }

                const idsParam = interventionAssignmentIds.join(',');
                return deleteRequest(`${baseUrl}delete_many/?ids=${idsParam}`);
            },
            invalidateQueryKey: ['interventionAssignments'],
        });
