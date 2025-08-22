import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { InterventionAssignmentCreate } from '../types/interventions';

export const UseCreateInterventionAssignment = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: InterventionAssignmentCreate) =>
            postRequest(`/api/snt_malaria/interventionassignments/`, body),
        invalidateQueryKey: ['interventionAssignments', 'budgets'],
    });
