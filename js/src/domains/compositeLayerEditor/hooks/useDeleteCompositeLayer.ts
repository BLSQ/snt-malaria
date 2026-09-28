import { deleteRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export const useDeleteCompositeLayer = (): UseMutationResult =>
    useSnackMutation({
        invalidateQueryKey: ['metricTypes', 'metricCategories', 'compositeLayers'],
        mutationFn: (compositeLayerId: number) =>
            deleteRequest(`/api/snt_malaria/composite_layers/${compositeLayerId}/`),
        // Used both for an explicit discard and for silently dropping a draft
        // shell the wizard is replacing; neither is worth a "Saved successfully" toast.
        showSuccessSnackBar: false,
    });
