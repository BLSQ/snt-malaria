import { putRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { InterventionDetails } from '../types';

type SaveInterventionDetailsBody = Partial<InterventionDetails> & {
    interventionId: number;
};

export const useSaveInterventionDetails = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: ({
            interventionId,
            ...body
        }: SaveInterventionDetailsBody) =>
            putRequest(
                `/api/snt_malaria/interventions/${interventionId}/update_details/`,
                body,
            ),
        // Partial match invalidates every ['interventionDetails', id] query key.
        invalidateQueryKey: [
            'interventionDetails',
            'interventionCategories',
            'calculated_budget',
        ],
        showSuccessSnackBar: false,
    });
