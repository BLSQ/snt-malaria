import { UseQueryResult } from 'react-query';
import { TaskStatus } from 'Iaso/domains/tasks/types';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';

export type OpenHexaImportStatus = {
    task_id: number;
    status: TaskStatus;
    progress_message: string;
    created_at: string | null;
    ended_at: string | null;
};

/** Latest value-import task status keyed by metric type id. */
export type OpenHexaImportStatusByMetricType = Record<
    string,
    OpenHexaImportStatus
>;

const IN_FLIGHT: TaskStatus[] = ['QUEUED', 'RUNNING'];

export const useGetOpenHexaImportStatus = (
    enabled = true,
): UseQueryResult<OpenHexaImportStatusByMetricType, Error> =>
    useSnackQuery({
        queryKey: ['openHexaImportStatus'],
        queryFn: () =>
            getRequest('/api/snt_malaria/openhexa/data_layers/import_status/'),
        dispatchOnError: false,
        options: {
            enabled,
            retry: false,
            // Poll while something is still running; otherwise leave it alone.
            refetchInterval: data =>
                data &&
                Object.values(data).some(entry =>
                    IN_FLIGHT.includes(entry.status),
                )
                    ? 5000
                    : false,
        },
    });
