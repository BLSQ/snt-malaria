import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

type CancelOpenHexaImportPayload = {
    metric_type_id: number;
};

/** Asks a data layer's in-flight OpenHexa value import to stop, e.g. when the wizard
 *  discards or re-picks the layer before the background task has finished. */
export const useCancelOpenHexaImport = (): UseMutationResult<
    unknown,
    unknown,
    CancelOpenHexaImportPayload
> =>
    useSnackMutation({
        mutationFn: (body: CancelOpenHexaImportPayload) =>
            postRequest(
                '/api/snt_malaria/openhexa/data_layers/cancel_import/',
                body,
            ),
        invalidateQueryKey: ['openHexaImportStatus'],
        showSuccessSnackBar: false,
    });
