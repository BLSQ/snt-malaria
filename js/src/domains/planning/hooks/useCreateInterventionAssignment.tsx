import { UseMutationResult } from 'react-query';
import { openSnackBar } from 'Iaso/components/snackBars/EventDispatcher';
import { succesfullSnackBar } from 'Iaso/constants/snackBars';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { InterventionAssignmentCreate } from '../types/interventions';

export const useCreateInterventionAssignment = (
    showDiffSnackbar?: boolean,
): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: InterventionAssignmentCreate) =>
            postRequest(`/api/snt_malaria/intervention_assignments/`, body),
        invalidateQueryKey: ['interventionAssignments'],
        showSuccessSnackBar: false,
        options: {
            onSuccess: data => {
                if (showDiffSnackbar) {
                    openSnackBar(
                        succesfullSnackBar(data.message, data.message),
                    );
                }
            },
        },
    });
