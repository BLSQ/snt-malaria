import React, { FC } from 'react';
import { Alert, AlertTitle, CircularProgress } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import {
    isFailedTaskStatus,
    isSuccessTaskStatus,
} from '../../../constants/taskStatus';
import { OpenHexaImportStatus } from '../hooks/useGetOpenHexaImportStatus';
import { MESSAGES } from '../messages';

const styles: SxStyles = {
    alert: { textAlign: 'center', justifyContent: 'center' },
};

type Props = {
    status?: OpenHexaImportStatus;
};

export const OpenHexaImportStatusMessage: FC<Props> = ({ status }) => {
    const { formatMessage } = useSafeIntl();

    if (status && isFailedTaskStatus(status.status)) {
        return (
            <Alert severity="error" sx={styles.alert}>
                {status.progress_message ||
                    formatMessage(MESSAGES.importFailed)}
            </Alert>
        );
    }
    if (status && isSuccessTaskStatus(status.status)) {
        return (
            <Alert severity="success" icon={false} sx={styles.alert}>
                {formatMessage(MESSAGES.wizardOpenHexaImportComplete)}
            </Alert>
        );
    }
    return (
        <Alert severity="info" sx={styles.alert} icon={false}>
            <AlertTitle>
                <CircularProgress size={16} sx={{ justifyContent: 'center' }} />
            </AlertTitle>
            {status?.progress_message ||
                formatMessage(MESSAGES.wizardOpenHexaImportInfo)}
        </Alert>
    );
};
