import React, { FC } from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { CircularProgress, Tooltip } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import {
    isFailedTaskStatus,
    isInFlightTaskStatus,
} from '../../../constants/taskStatus';
import { OpenHexaImportStatus } from '../hooks/useGetOpenHexaImportStatus';
import { MESSAGES } from '../messages';

const styles = {
    icon: { ml: 1, flexShrink: 0 },
} satisfies SxStyles;

type Props = {
    importStatus?: OpenHexaImportStatus;
};

/** Badge next to an OpenHexa layer's name: a spinner while its value-import task runs,
 *  a red icon if it failed, nothing once it succeeded. */
export const ImportStatusIndicator: FC<Props> = ({ importStatus }) => {
    const { formatMessage } = useSafeIntl();
    if (!importStatus) return null;
    const { status, progress_message: message } = importStatus;

    if (isInFlightTaskStatus(status)) {
        return (
            <Tooltip title={message || formatMessage(MESSAGES.importRunning)}>
                <CircularProgress size={14} sx={styles.icon} />
            </Tooltip>
        );
    }
    if (isFailedTaskStatus(status)) {
        return (
            <Tooltip title={message || formatMessage(MESSAGES.importFailed)}>
                <ErrorOutlineIcon
                    fontSize="small"
                    color="error"
                    sx={styles.icon}
                />
            </Tooltip>
        );
    }
    return null;
};
