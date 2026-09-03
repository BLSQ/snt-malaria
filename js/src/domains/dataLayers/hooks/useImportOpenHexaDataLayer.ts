import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MESSAGES } from '../messages';
import { ScaleDomainRange } from '../types/metrics';

type ImportOpenHexaDataLayerPayload = {
    code: string;
    legend_config?: ScaleDomainRange;
};

/** Creates (or refreshes) an OpenHexa data layer: upserts the MetricType shell and
 *  launches the background task that loads its values from OpenHexa. */
export const useImportOpenHexaDataLayer = ({
    onSuccess,
}: { onSuccess?: () => void } = {}): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: ImportOpenHexaDataLayerPayload) =>
            postRequest('/api/snt_malaria/openhexa/data_layers/', body),
        // Categories + values so the map and the list pick up the new (still empty) layer;
        // import status so the row badge shows the freshly-launched task.
        invalidateQueryKey: [
            'metricTypes',
            'metricCategories',
            'metricValues',
            'openHexaImportStatus',
        ],
        snackSuccessMessage: MESSAGES.openHexaImportStarted,
        options: {
            onSuccess: () => onSuccess?.(),
        },
    });
