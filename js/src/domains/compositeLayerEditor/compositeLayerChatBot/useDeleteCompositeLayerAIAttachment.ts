import { useMutation } from 'react-query';
import { deleteRequest } from 'Iaso/libs/Api';

export const attachmentUrl = (fileId: string): string =>
    `/api/snt_malaria/composite_layer_ai/attachments/${fileId}/`;

export const useDeleteCompositeLayerAIAttachment = () => {
    return useMutation<boolean, Error, string>((fileId: string) =>
        deleteRequest(attachmentUrl(fileId)),
    );
};
