import { UseMutationResult, useQueryClient } from 'react-query';
import { patchRequest, postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MESSAGES } from '../messages';
import {
    CompositeLayer,
    SaveCompositeLayerPayload,
} from '../types/compositeLayer';

export const useSaveCompositeLayer = (): UseMutationResult<
    CompositeLayer,
    unknown,
    SaveCompositeLayerPayload
> => {
    const queryClient = useQueryClient();
    return useSnackMutation({
        snackSuccessMessage: MESSAGES.saveSuccess,
        // Invalidate the data layers list so the composite appears/updates immediately.
        invalidateQueryKey: ['metricTypes'],
        options: {
            onSuccess: (
                _data: CompositeLayer,
                { id }: SaveCompositeLayerPayload,
            ) => {
                // Refresh values shown on the map and the composite lookup map.
                queryClient.invalidateQueries(['metricValues']);
                queryClient.invalidateQueries(['compositeLayers']);
                // Drop the cached graph so a subsequent edit reloads the freshly-saved one.
                if (id) {
                    queryClient.removeQueries(['compositeLayer', id]);
                }
            },
        },
        mutationFn: ({ id, ...rest }: SaveCompositeLayerPayload) => {
            // Omit undefined fields so a partial update keeps the backend's current value.
            const body = Object.fromEntries(
                Object.entries(rest).filter(
                    ([, value]) => value !== undefined,
                ),
            );
            return id
                ? patchRequest(`/api/snt_malaria/composite_layers/${id}/`, body)
                : postRequest('/api/snt_malaria/composite_layers/', body);
        },
    });
};
