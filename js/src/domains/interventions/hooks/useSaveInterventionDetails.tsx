import { putRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { InterventionDetails } from '../../planning/types/interventions';

export const useSaveInterventionDetails = (
    interventionId?: number,
): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: Partial<InterventionDetails>) =>
            putRequest(
                `/api/snt_malaria/interventions/${interventionId}/update_details/`,
                body,
            ),
        invalidateQueryKey: [
            `interventionDetails_${interventionId}`,
            'interventionCategories',
        ],
        showSuccessSnackBar: false,
    });
