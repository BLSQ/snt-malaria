import { UseMutationResult } from 'react-query';
import { ApiError, postRequest, putRequest } from 'Iaso/libs/Api';
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
                ? putRequest(`/api/metrictypes/${body.id}/`, body)
                : postRequest(`/api/metrictypes/`, body),
        ignoreErrorCodes: [400],
        options: {
            onError: (error: ApiError) => {
                if (
                    error.details.code?.includes(
                        'MetricType with this code already exists.',
                    )
                ) {
                    onError('duplicateCodeError');
                } else {
                    onError('genericError');
                }
            },
            onSuccess: onSuccess,
        },
    });
