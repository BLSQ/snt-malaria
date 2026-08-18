import { useMutation } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { UploadedAttachment } from './types';

export const useUploadCompositeLayerAIAttachment = () => {
    return useMutation<UploadedAttachment, Error, File>((file: File) =>
        postRequest(
            '/api/snt_malaria/composite_layer_ai/attachments/',
            undefined,
            { file },
        ),
    );
};
