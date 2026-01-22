import { UseMutationResult } from 'react-query';
import { postRequest, putRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MetricTypeFormModel } from '../../planning/types/metrics';

export const useCreateOrUpdateMetricType = (): UseMutationResult =>
    useSnackMutation({
        invalidateQueryKey: ['metricTypes', 'metricCategories'],
        mutationFn: (body: MetricTypeFormModel) =>
            body.id
                ? putRequest(`/api/metrictypes/${body.id}/`, body)
                : postRequest(`/api/metrictypes/`, body),
    });
