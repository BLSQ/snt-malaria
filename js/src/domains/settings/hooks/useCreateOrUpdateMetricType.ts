import { UseMutationResult } from 'react-query';
import { ApiError, patchRequest, postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MetricTypeFormModel } from '../../planning/types/metrics';

export const useCreateOrUpdateMetricType = ({
    onError,
    onSuccess,
}): UseMutationResult =>
    useSnackMutation({
        invalidateQueryKey: ['metricTypes', 'metricCategories'],
        mutationFn: (body: MetricTypeFormModel) =>
            body.id
                ? patchRequest(`/api/metrictypes/${body.id}/`, body)
                : postRequest(`/api/metrictypes/`, body),
        ignoreErrorCodes: [400],
        options: {
            onError: (error: ApiError) => {
                onError(error.details.code?.[0] || 'generic');
            },
            onSuccess: onSuccess,
        },
    });
