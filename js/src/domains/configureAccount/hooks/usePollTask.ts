import { useEffect, useState } from 'react';

import { UseQueryResult } from 'react-query';

import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';

export const TASK_STATUS_TERMINAL = ['SUCCESS', 'ERRORED', 'KILLED'] as const;
export type TaskStatusTerminal = (typeof TASK_STATUS_TERMINAL)[number];

export type Task = {
    id: number;
    status: 'QUEUED' | 'RUNNING' | TaskStatusTerminal | string;
    progress_value: number;
    end_value: number;
    progress_message: string | null;
    name?: string;
    result?: { message?: string } | null;
};

const isTerminal = (status: string | undefined): boolean =>
    TASK_STATUS_TERMINAL.includes(status as TaskStatusTerminal);

type ApiLikeError = { status?: number };

const isPermanentStatus = (status: number | undefined): boolean =>
    status === 403 || status === 404 || status === 410;

/**
 * Polls `/api/tasks/<id>/` every 2s until the task reaches a terminal status
 * (`SUCCESS`, `ERRORED`, `KILLED`).
 *
 * Polling stops on:
 * - terminal status, or
 * - a permanent fetch error (403/404/410), or
 * - exhausted retries on transient errors (up to 3 retries by default).
 *
 * Once we've stopped, we fully disable the query (via `enabled`) so the
 * import progress bar is replaced by the wizard's "Restart" panel and stays
 * there even on tab refocus / network reconnect.
 */
export const usePollTask = (
    taskId: number | undefined,
): UseQueryResult<Task, Error> => {
    const [hasFailed, setHasFailed] = useState(false);
    useEffect(() => {
        setHasFailed(false);
    }, [taskId]);

    return useSnackQuery({
        queryKey: ['snt_malaria_configureAccount_task', taskId],
        queryFn: () => getRequest(`/api/tasks/${taskId}/`),
        options: {
            enabled: Boolean(taskId) && !hasFailed,
            refetchInterval: data => (isTerminal(data?.status) ? false : 2000),
            refetchIntervalInBackground: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: (failureCount, error) => {
                if (isPermanentStatus((error as ApiLikeError)?.status)) {
                    return false;
                }
                return failureCount < 3;
            },
            onError: () => {
                // Fires only after `retry` has decided not to try again, so
                // this is the right place to flip `enabled` off for good.
                setHasFailed(true);
            },
        },
    });
};
