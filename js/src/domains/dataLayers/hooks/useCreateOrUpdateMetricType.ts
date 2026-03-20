import { UseMutationResult } from 'react-query';
import { ApiError, patchRequest, postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

type MetricTypePayload = {
    id?: number;
    name: string;
    code: string;
    description: string;
    source: string;
    units: string;
    unit_symbol: string;
    comments: string;
    category: string;
    legend_type: string;
    origin: string;
    legend_config: {
        domain: string[];
        range: string[];
    };
};

export const useCreateOrUpdateMetricType = ({
    onError,
    onSuccess,
}): UseMutationResult =>
    useSnackMutation({
        invalidateQueryKey: ['metricTypes', 'metricCategories'],
        mutationFn: (body: MetricTypePayload) =>
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
