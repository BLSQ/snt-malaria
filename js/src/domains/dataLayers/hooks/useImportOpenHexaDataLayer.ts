import { UseMutationResult } from 'react-query';
import { Task } from 'Iaso/domains/tasks/types';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MESSAGES } from '../messages';
import { ScaleDomainRange } from '../types/metrics';

type ImportOpenHexaDataLayerPayload = {
    code: string;
    legend_config?: ScaleDomainRange;
};

type ImportOpenHexaDataLayerResponse = {
    task: Task<unknown>;
    metric_type_id: number;
};

/** Creates (or refreshes) an OpenHexa data layer: upserts the MetricType shell and
 *  launches the background task that loads its values from OpenHexa. */
export const useImportOpenHexaDataLayer = ({
    onSuccess,
}: { onSuccess?: () => void } = {}): UseMutationResult<
    ImportOpenHexaDataLayerResponse,
    unknown,
    ImportOpenHexaDataLayerPayload
> =>
    useSnackMutation({
        mutationFn: (body: ImportOpenHexaDataLayerPayload) =>
            postRequest('/api/snt_malaria/openhexa/data_layers/', body),
        // The new layer is an empty shell at this point; `openHexaImportStatus` drives the
        // row badge and, on task completion, the layer list + values refetch.
        invalidateQueryKey: ['metricTypes', 'openHexaImportStatus'],
        snackSuccessMessage: MESSAGES.openHexaImportStarted,
        options: {
            onSuccess: () => onSuccess?.(),
        },
    });
