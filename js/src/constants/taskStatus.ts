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

const IN_FLIGHT: TaskStatus[] = [TASK_STATUS.QUEUED, TASK_STATUS.RUNNING];
const FAILED: TaskStatus[] = [TASK_STATUS.ERRORED, TASK_STATUS.KILLED];
const TERMINAL: TaskStatus[] = [TASK_STATUS.SUCCESS, ...FAILED];

const includesStatus = (statuses: TaskStatus[], status?: string): boolean =>
    statuses.includes(status as TaskStatus);

/** Task still working - poll for updates, show a spinner. */
export const isInFlightTaskStatus = (status?: string): boolean =>
    includesStatus(IN_FLIGHT, status);

/** Task stopped without producing data - show an error. */
export const isFailedTaskStatus = (status?: string): boolean =>
    includesStatus(FAILED, status);

/** Task will not change any more (succeeded or failed). */
export const isTerminalTaskStatus = (status?: string): boolean =>
    includesStatus(TERMINAL, status);
