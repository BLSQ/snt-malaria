import React, { FunctionComponent, useEffect } from 'react';

import { Box, LinearProgress, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MessageDescriptor } from 'react-intl';

import { SxStyles } from 'Iaso/types/general';

import { baseUrls } from '../../../constants/urls';
import { WizardStep } from './WizardStep';
import { usePollTask } from '../hooks/usePollTask';
import { MESSAGES } from '../messages';

type Props = {
    taskId: number | undefined;
    onAdvance: () => void;
    /** Terminal failure — marks this step in the stepper. Recovery is Restart only. */
    onError?: () => void;
};

const styles = {
    progressWrapper: { mt: 2 },
    progressMessage: {
        mt: 1,
        color: 'text.secondary',
        fontSize: '0.85rem',
    },
    error: { mt: 2, color: 'error.main' },
} satisfies SxStyles;

// Send the user through `/logout-iaso` so they end up anonymous on the public
// setup page. The path is allow-listed via `LOGOUT_NEXT_ALLOWED_PATHS`.
const RESTART_URL = `/logout-iaso?next=${encodeURIComponent(`/${baseUrls.setupAccount}`)}`;

const goToRestart = (): void => {
    window.location.assign(RESTART_URL);
};

export const ImportBoundariesStep: FunctionComponent<Props> = ({
    taskId,
    onAdvance,
    onError,
}) => {
    const { formatMessage } = useSafeIntl();

    const { data: task, isError: taskFetchError } = usePollTask(taskId);
    const importDone = task?.status === 'SUCCESS';
    const importTerminalFailure =
        task?.status === 'ERRORED' ||
        task?.status === 'KILLED' ||
        taskFetchError;

    const hasStepperError =
        !taskId || (!importDone && importTerminalFailure);

    useEffect(() => {
        if (hasStepperError) {
            onError?.();
        }
    }, [hasStepperError, onError]);

    const stepErrorWithHelp = (specific: MessageDescriptor): string =>
        `${formatMessage(specific)} ${formatMessage(MESSAGES.errorHelpSuffix)}`;

    if (!taskId) {
        return (
            <WizardStep
                title={formatMessage(MESSAGES.importTitle)}
                onSubmit={goToRestart}
                submitLabel={formatMessage(MESSAGES.restart)}
                submitDataTestId="configureAccount-import-restart"
            >
                <Typography sx={styles.error}>
                    {stepErrorWithHelp(MESSAGES.missingTaskId)}
                </Typography>
            </WizardStep>
        );
    }

    if (importDone) {
        return (
            <WizardStep
                title={formatMessage(MESSAGES.importSuccessTitle)}
                description={formatMessage(MESSAGES.importSuccessDescription)}
                onSubmit={onAdvance}
                submitDataTestId="configureAccount-import-next"
            />
        );
    }

    const progressValue =
        task && task.end_value > 0
            ? Math.min(100, (task.progress_value / task.end_value) * 100)
            : 0;

    return (
        <WizardStep
            title={formatMessage(MESSAGES.importTitle)}
            description={formatMessage(MESSAGES.importDescription)}
            onSubmit={importTerminalFailure ? goToRestart : undefined}
            submitLabel={
                importTerminalFailure
                    ? formatMessage(MESSAGES.restart)
                    : undefined
            }
            submitDataTestId={
                importTerminalFailure
                    ? 'configureAccount-import-restart'
                    : undefined
            }
        >
            {!importTerminalFailure ? (
                <Box sx={styles.progressWrapper}>
                    <LinearProgress
                        variant={
                            task && task.end_value > 0
                                ? 'determinate'
                                : 'indeterminate'
                        }
                        value={progressValue}
                    />
                    {task?.progress_message && (
                        <Typography sx={styles.progressMessage}>
                            {task.progress_message}
                        </Typography>
                    )}
                </Box>
            ) : null}
            {importTerminalFailure && (
                <Typography sx={styles.error}>
                    {stepErrorWithHelp(
                        task?.status === 'KILLED'
                            ? MESSAGES.importKilled
                            : MESSAGES.importErrored,
                    )}
                </Typography>
            )}
        </WizardStep>
    );
};
