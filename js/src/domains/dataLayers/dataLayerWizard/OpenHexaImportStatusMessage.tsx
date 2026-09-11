import React, { FC } from 'react';
import { Alert, CircularProgress } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import {
    isFailedTaskStatus,
    isSuccessTaskStatus,
} from '../../../constants/taskStatus';
import { OpenHexaImportStatus } from '../hooks/useGetOpenHexaImportStatus';
import { MESSAGES } from '../messages';

const styles: SxStyles = {
    alert: { maxWidth: 460 },
};

type Props = {
    /** The layer's OpenHexa import status, once created — see `useWizardMapPreview`,
     *  which already polls it for the map preview so this doesn't poll it again. */
    status?: OpenHexaImportStatus;
};

/** Live status of an OpenHexa layer's background import — the wizard creates the
 *  layer and launches this as soon as the Details step is left, so this is what
 *  "creating" looks like on the Data and Legend steps while it runs. */
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
        <Alert
            severity="info"
            icon={<CircularProgress size={16} />}
            sx={styles.alert}
        >
            {status?.progress_message ||
                formatMessage(MESSAGES.wizardOpenHexaImportInfo)}
        </Alert>
    );
};
