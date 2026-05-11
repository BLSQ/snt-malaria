import React, { FunctionComponent, Fragment } from 'react';

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Typography } from '@mui/material';

import { SxStyles } from 'Iaso/types/general';

type Props = {
    activeStep: number;
    steps: string[];
    /** When set, this step shows an error marker instead of active/pending. */
    errorStepIndex?: number;
};

type StepState = 'completed' | 'active' | 'pending' | 'error';

const stepStateColor: Record<StepState, string> = {
    completed: 'success.main',
    active: 'primary.main',
    pending: 'text.disabled',
    /** Darker shade than `error.main` — standard MUI palette. */
    error: 'error.dark',
};

const resolveStepState = (
    idx: number,
    activeStep: number,
    errorStepIndex: number | undefined,
): StepState => {
    if (errorStepIndex !== undefined && idx === errorStepIndex) {
        return 'error';
    }
    if (idx < activeStep) {
        return 'completed';
    }
    if (idx === activeStep) {
        return 'active';
    }
    return 'pending';
};

/** Label color follows wizard position only — error styling is circle-only. */
const labelColor = (idx: number, activeStep: number): string =>
    idx > activeStep ? 'text.secondary' : 'text.primary';

const styles = {
    root: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    item: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
    },
    circleBase: {
        width: 28,
        height: 28,
        borderRadius: '50%',
        color: 'common.white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 14,
        flexShrink: 0,
    },
    labelBase: {
        fontWeight: 700,
        whiteSpace: 'nowrap',
    },
    connector: {
        width: 40,
        height: '1px',
        bgcolor: 'text.disabled',
        flexShrink: 0,
    },
} satisfies SxStyles;

/**
 * Numbered step indicator above the wizard content.
 *
 * `activeStep` is 0-based; `activeStep === steps.length` marks every step
 * completed (end-of-wizard). Optional `errorStepIndex` shows that step with
 * an error icon instead of its number or active styling.
 */
export const WizardStepper: FunctionComponent<Props> = ({
    activeStep,
    steps,
    errorStepIndex,
}) => (
    <Box sx={styles.root}>
        {steps.map((label, idx) => {
            const state = resolveStepState(idx, activeStep, errorStepIndex);
            return (
                <Fragment key={label}>
                    <Box sx={styles.item}>
                        <Box
                            sx={[
                                styles.circleBase,
                                { bgcolor: stepStateColor[state] },
                            ]}
                        >
                            {state === 'completed' ? (
                                <CheckIcon sx={[{ fontSize: 18 }]} />
                            ) : state === 'error' ? (
                                <CloseIcon sx={[{ fontSize: 18 }]} />
                            ) : (
                                idx + 1
                            )}
                        </Box>
                        <Typography
                            variant="body2"
                            sx={[
                                styles.labelBase,
                                { color: labelColor(idx, activeStep) },
                            ]}
                        >
                            {label}
                        </Typography>
                    </Box>
                    {idx < steps.length - 1 && <Box sx={styles.connector} />}
                </Fragment>
            );
        })}
    </Box>
);
