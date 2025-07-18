import { UseMutationResult } from 'react-query';
import { deleteRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export const UseRemoveOrgUnitFromInterventionPlan = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (interventionAssignmentId: number) =>
            deleteRequest(
                `/api/snt_malaria/interventionassignments/${interventionAssignmentId}/`,
            ),
        invalidateQueryKey: ['interventionAssignments'],
    });
