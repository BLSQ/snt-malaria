import { useRef } from 'react';
import { useQueryClient, UseQueryResult } from 'react-query';
import { TaskStatus } from 'Iaso/domains/tasks/types';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import {
    isInFlightTaskStatus,
    isTerminalTaskStatus,
} from '../../../constants/taskStatus';

export type OpenHexaImportStatus = {
    task_id: number;
    status: TaskStatus;
    progress_message: string;
};

/** Latest value-import task status keyed by metric type id. */
export type OpenHexaImportStatusByMetricType = Record<
    string,
    OpenHexaImportStatus
>;

/** Polls the per-layer import status while any task is in flight, and refetches the
 *  layer list + values once a task it was tracking reaches a terminal state. */
export const useGetOpenHexaImportStatus = (
    enabled = true,
): UseQueryResult<OpenHexaImportStatusByMetricType, Error> => {
    const queryClient = useQueryClient();
    const prevStatuses = useRef<Record<number, TaskStatus>>({});

    return useSnackQuery({
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
                    isInFlightTaskStatus(entry.status),
                )
                    ? 5000
                    : false,
            onSuccess: (data: OpenHexaImportStatusByMetricType) => {
                const prev = prevStatuses.current;
                const entries = Object.values(data ?? {});
                const justFinished = entries.some(
                    entry =>
                        isTerminalTaskStatus(entry.status) &&
                        isInFlightTaskStatus(prev[entry.task_id]),
                );
                prevStatuses.current = Object.fromEntries(
                    entries.map(entry => [entry.task_id, entry.status]),
                );
                if (justFinished) {
                    queryClient.invalidateQueries(['metricTypes']);
                    queryClient.invalidateQueries(['metricValues']);
                }
            },
        },
    });
};
