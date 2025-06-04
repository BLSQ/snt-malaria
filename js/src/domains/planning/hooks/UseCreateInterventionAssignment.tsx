import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { UseMutationResult } from 'react-query';
import { InterventionAssignment } from '../types/interventions';

export const UseCreateInterventionAssignment = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: InterventionAssignment) =>
            postRequest(`/api/snt_malaria/interventionassignments/`, body),
        invalidateQueryKey: ['interventionassignments', 'budgets'],
    });
