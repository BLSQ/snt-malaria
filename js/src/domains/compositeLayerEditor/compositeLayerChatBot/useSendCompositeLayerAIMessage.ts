import { useMutation } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { CompositeLayerAIRequest, CompositeLayerAIResponse } from './types';

export const useSendCompositeLayerAIMessage = () => {
    return useMutation<
        CompositeLayerAIResponse,
        Error,
        CompositeLayerAIRequest
    >((data: CompositeLayerAIRequest) =>
        postRequest('/api/snt_malaria/composite_layer_ai/', data),
    );
};
