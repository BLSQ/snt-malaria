import { deleteRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export const useDeleteMetricType = (): UseMutationResult =>
    useSnackMutation({
        invalidateQueryKey: ['metricTypes', 'metricCategories'],
        mutationFn: (metricTypeId: number) =>
            deleteRequest(`/api/metrictypes/${metricTypeId}/`),
        // Used both for an explicit discard and for silently dropping a draft
        // shell the wizard is replacing (e.g. re-picking an OpenHexa source);
        // neither is worth a "Saved successfully" toast.
        showSuccessSnackBar: false,
    });
