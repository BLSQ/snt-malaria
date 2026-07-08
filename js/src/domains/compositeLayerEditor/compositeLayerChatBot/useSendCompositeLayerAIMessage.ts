import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { CompositeLayerAIRequest, CompositeLayerAIResponse } from './types';

export const useSendCompositeLayerAIMessage = () => {
    return useSnackMutation<
        CompositeLayerAIResponse,
        Error,
        CompositeLayerAIRequest
    >({
        mutationFn: (data: CompositeLayerAIRequest) =>
            postRequest('/api/snt_malaria/composite_layer_ai/', data),
        showSuccessSnackBar: false,
    });
};
