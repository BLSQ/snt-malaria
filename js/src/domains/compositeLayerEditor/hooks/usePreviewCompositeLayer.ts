import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { CompositePreview } from '../types/compositeLayer';
import { FlumeGraph } from '../types/flumeGraph';

/**
 * Runs the composite graph on the backend and returns the resulting per-org-unit values + legend,
 * without persisting anything. Used to drive the live preview map in the editor.
 *
 * Invalid/incomplete graphs return a 400 while the user is still building; those are ignored so we
 * don't spam error snackbars (the editor shows the message inline instead).
 */
export const usePreviewCompositeLayer = (): UseMutationResult<
    CompositePreview,
    unknown,
    FlumeGraph
> =>
    useSnackMutation({
        showSuccessSnackBar: false,
        ignoreErrorCodes: [400],
        mutationFn: (graph: FlumeGraph) =>
            postRequest('/api/snt_malaria/composite_layers/preview/', {
                graph,
            }),
    });
