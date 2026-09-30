import {
    isFailedTaskStatus,
    isInFlightTaskStatus,
} from '../../../constants/taskStatus';
import { OpenHexaImportStatus } from '../hooks/useGetOpenHexaImportStatus';

export type ImportStatusKind = 'loading' | 'error';

export const getImportStatusKind = (
    importStatus?: OpenHexaImportStatus,
): ImportStatusKind | undefined => {
    if (!importStatus) return undefined;
    if (isInFlightTaskStatus(importStatus.status)) return 'loading';
    if (isFailedTaskStatus(importStatus.status)) return 'error';
    return undefined;
};
