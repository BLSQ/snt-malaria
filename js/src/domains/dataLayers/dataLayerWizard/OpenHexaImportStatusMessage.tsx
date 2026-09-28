import React, { FC } from 'react';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, CircularProgress, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import {
    isFailedTaskStatus,
    isSuccessTaskStatus,
} from '../../../constants/taskStatus';
import { OpenHexaImportStatus } from '../hooks/useGetOpenHexaImportStatus';
import { MESSAGES } from '../messages';

const styles = {
    box: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
    },
    error: {
        borderColor: 'error.main',
        backgroundColor: theme => alpha(theme.palette.error.main, 0.08),
    },
    success: {
        borderColor: 'success.main',
        backgroundColor: theme => alpha(theme.palette.success.main, 0.08),
    },
    info: {
        borderColor: 'primary.main',
        backgroundColor: theme => alpha(theme.palette.primary.main, 0.06),
    },
} satisfies SxStyles;

type Props = {
    status?: OpenHexaImportStatus;
};

export const OpenHexaImportStatusMessage: FC<Props> = ({ status }) => {
    const { formatMessage } = useSafeIntl();

    if (status && isFailedTaskStatus(status.status)) {
        return (
            <Box sx={[styles.box, styles.error]}>
                <ErrorOutlineIcon fontSize="small" color="error" />
                <Typography variant="body2" color="error.main">
                    {status.progress_message ||
                        formatMessage(MESSAGES.importFailed)}
                </Typography>
            </Box>
        );
    }
    if (status && isSuccessTaskStatus(status.status)) {
        return (
            <Box sx={[styles.box, styles.success]}>
                <CheckCircleOutlineIcon fontSize="small" color="success" />
                <Typography variant="body2" color="success.main">
                    {formatMessage(MESSAGES.wizardOpenHexaImportComplete)}
                </Typography>
            </Box>
        );
    }
    return (
        <Box sx={[styles.box, styles.info]}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="primary.main">
                {status?.progress_message ||
                    formatMessage(MESSAGES.wizardOpenHexaImportInfo)}
            </Typography>
        </Box>
    );
};
