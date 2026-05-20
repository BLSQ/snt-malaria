import React, { FC, ReactNode } from 'react';

import { Box, Button, CircularProgress, Typography } from '@mui/material';

import { useSafeIntl } from 'bluesquare-components';

import { SxStyles } from 'Iaso/types/general';

import { MESSAGES } from '../messages';

const styles = {
    title: { mb: 1 },
    description: { color: 'text.secondary', mb: 3 },
    loading: {
        display: 'flex',
        justifyContent: 'center',
        py: 4,
    },
    actions: {
        mt: 3,
        display: 'flex',
        justifyContent: 'flex-end',
    },
} satisfies SxStyles;

type Props = {
    title: ReactNode;
    description?: ReactNode;
    loading?: boolean;
    children?: ReactNode;
    isLastStep?: boolean;
    onSubmit?: () => void | Promise<void>;
    submitting?: boolean;
    submitDisabled?: boolean;
    submitDataTestId?: string;
    /** Overrides the idle label (still shows the saving label while `submitting`). */
    submitLabel?: ReactNode;
};

/**
 * Layout for one wizard step: title, optional description, body, and an
 * optional primary button when `onSubmit` is provided.
 *
 * Idle label is Next / Finish from `isLastStep`, unless `submitLabel` is set
 * (e.g. Restart). While `submitting`, the saving label is always shown.
 */
export const WizardStep: FC<Props> = ({
    title,
    description,
    loading = false,
    children,
    isLastStep = false,
    onSubmit,
    submitting = false,
    submitDisabled = false,
    submitDataTestId,
    submitLabel,
}) => {
    const { formatMessage } = useSafeIntl();

    const showPrimary = !loading && Boolean(onSubmit);

    const idleLabel =
        submitLabel ??
        formatMessage(isLastStep ? MESSAGES.finish : MESSAGES.next);

    return (
        <>
            <Typography variant="h6" sx={styles.title}>
                {title}
            </Typography>
            {loading ? (
                <Box sx={styles.loading}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {description != null ? (
                        <Typography variant="body2" sx={styles.description}>
                            {description}
                        </Typography>
                    ) : null}
                    {children}
                    {showPrimary && (
                        <Box sx={styles.actions}>
                            <Button
                                type="button"
                                data-test={submitDataTestId}
                                variant="contained"
                                color="primary"
                                onClick={() => {
                                    void onSubmit?.();
                                }}
                                disabled={submitDisabled || submitting}
                            >
                                {submitting
                                    ? formatMessage(MESSAGES.saving)
                                    : idleLabel}
                            </Button>
                        </Box>
                    )}
                </>
            )}
        </>
    );
};
