import { putRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { InterventionDetails } from '../types';
import { BUDGET_QUERY_KEYS } from '../../../constants/queryKeys';

type SaveInterventionDetailsBody = Partial<
    Pick<InterventionDetails, 'name' | 'impact_ref' | 'grant'>
> & {
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
            ...BUDGET_QUERY_KEYS,
            'interventionDetails',
            'interventionCategories',
        ],
        showSuccessSnackBar: false,
    });
