import { TaskStatus } from 'Iaso/domains/tasks/types';

/** Named task statuses - use instead of bare string literals. */
export const TASK_STATUS = {
    QUEUED: 'QUEUED',
    RUNNING: 'RUNNING',
    SUCCESS: 'SUCCESS',
    ERRORED: 'ERRORED',
    KILLED: 'KILLED',
    SKIPPED: 'SKIPPED',
    EXPORTED: 'EXPORTED',
} as const satisfies Record<string, TaskStatus>;

/** Task still working - poll for updates, show a spinner. */
export const IN_FLIGHT_TASK_STATUSES: TaskStatus[] = [
    TASK_STATUS.QUEUED,
    TASK_STATUS.RUNNING,
];

/** Task stopped without producing data - show an error. */
export const FAILED_TASK_STATUSES: TaskStatus[] = [
    TASK_STATUS.ERRORED,
    TASK_STATUS.KILLED,
];

/** Task will not change any more (succeeded or failed). */
export const TERMINAL_TASK_STATUSES: TaskStatus[] = [
    TASK_STATUS.SUCCESS,
    ...FAILED_TASK_STATUSES,
];

const includesStatus = (statuses: TaskStatus[], status?: string): boolean =>
    statuses.includes(status as TaskStatus);

export const isInFlightTaskStatus = (status?: string): boolean =>
    includesStatus(IN_FLIGHT_TASK_STATUSES, status);

export const isFailedTaskStatus = (status?: string): boolean =>
    includesStatus(FAILED_TASK_STATUSES, status);

export const isTerminalTaskStatus = (status?: string): boolean =>
    includesStatus(TERMINAL_TASK_STATUSES, status);
