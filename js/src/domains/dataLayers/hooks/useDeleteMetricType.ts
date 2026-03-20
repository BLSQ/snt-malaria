import { deleteRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

export const useDeleteMetricType = (): UseMutationResult =>
    useSnackMutation({
        invalidateQueryKey: ['metricTypes', 'metricCategories'],
        mutationFn: (metricTypeId: number) =>
            deleteRequest(`/api/metrictypes/${metricTypeId}/`),
    });
