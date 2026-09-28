import React, { FC, Fragment } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import { Box, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

type StepState = 'completed' | 'active' | 'pending';

const circleColor: Record<StepState, string> = {
    completed: 'success.main',
    active: 'primary.main',
    pending: 'text.disabled',
};

const stepState = (index: number, activeStep: number): StepState => {
    if (index < activeStep) return 'completed';
    if (index === activeStep) return 'active';
    return 'pending';
};

const styles = {
    root: {
        display: 'flex',
        alignItems: 'flex-start',
        width: '100%',
        marginTop: 2,
    },
    item: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        flex: '0 0 auto',
        width: 68,
    },
    circle: {
        width: 26,
        height: 26,
        borderRadius: '50%',
        color: 'common.white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 13,
        flexShrink: 0,
    },
    label: {
        textAlign: 'center',
        lineHeight: 1.15,
        fontWeight: 600,
        fontSize: 13,
    },
    connector: {
        flex: '1 1 auto',
        minWidth: 8,
        height: '2px',
        mt: '13px',
        bgcolor: 'text.disabled',
    },
} satisfies SxStyles;

type Props = {
    activeStep: number;
    steps: string[];
};

export const WizardStepRail: FC<Props> = ({ activeStep, steps }) => (
    <Box sx={styles.root}>
        {steps.map((label, idx) => {
            const state = stepState(idx, activeStep);
            return (
                <Fragment key={label}>
                    <Box sx={styles.item}>
                        <Box
                            sx={[
                                styles.circle,
                                { bgcolor: circleColor[state] },
                            ]}
                        >
                            {state === 'completed' ? (
                                <CheckIcon sx={{ fontSize: 16 }} />
                            ) : (
                                idx + 1
                            )}
                        </Box>
                        <Typography
                            variant="caption"
                            sx={[
                                styles.label,
                                {
                                    color:
                                        idx > activeStep
                                            ? 'text.secondary'
                                            : 'text.primary',
                                },
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
