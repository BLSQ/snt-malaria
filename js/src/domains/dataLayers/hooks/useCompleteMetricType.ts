import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MetricType } from '../types/metrics';

/** Flips a wizard-created shell to `is_complete=true` once it has usable values/legend.
 *  A no-op server-side if the metric type is already complete, so this is safe to call
 *  unconditionally at the end of the wizard. */
export const useCompleteMetricType = (): UseMutationResult<
    MetricType,
    unknown,
    number
> =>
    useSnackMutation({
        invalidateQueryKey: ['metricTypes', 'metricCategories'],
        mutationFn: (metricTypeId: number) =>
            postRequest(`/api/metrictypes/${metricTypeId}/complete/`),
        showSuccessSnackBar: false,
    });
