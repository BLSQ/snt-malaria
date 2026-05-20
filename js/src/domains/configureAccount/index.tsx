import React, {
    FunctionComponent,
    useCallback,
    useMemo,
    useState,
} from 'react';

import { Box, Paper } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';

import TopBar from 'Iaso/components/nav/TopBarComponent';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';
import { SxStyles } from 'Iaso/types/general';

import { baseUrls } from '../../constants/urls';
import { AccountSettingsStep } from './components/AccountSettingsStep';
import { BudgetSettingsStep } from './components/BudgetSettingsStep';
import { ImportBoundariesStep } from './components/ImportBoundariesStep';
import { UserInfoStep } from './components/UserInfoStep';
import { WizardStepper } from './components/WizardStepper';
import { MESSAGES } from './messages';

const styles = {
    root: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'grey.100',
    },
    container: {
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
    },
    stepperOverlay: {
        position: 'absolute',
        top: '8%',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        px: 4,
    },
    stepper: {
        width: '100%',
        maxWidth: 560,
    },
    paper: {
        width: '100%',
        maxWidth: 560,
        p: 4,
        borderRadius: 4,
        boxShadow: 'none',
        backgroundColor: 'common.white',
    },
} satisfies SxStyles;

const HOME_URL = `/dashboard/${baseUrls.dataLayers}`;

export const ConfigureAccount: FunctionComponent = () => {
    const { formatMessage } = useSafeIntl();

    const params = useParamsObject(baseUrls.configureAccount);
    const taskId = useMemo(() => {
        const raw = params?.taskId;
        if (!raw || typeof raw !== 'string') return undefined;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : undefined;
    }, [params]);

    const [activeStep, setActiveStep] = useState(0);
    const [errorStepIndex, setErrorStepIndex] = useState<number | undefined>();

    const onError = useCallback(() => {
        setErrorStepIndex(activeStep);
    }, [activeStep]);

    const stepLabels = useMemo(
        () => [
            formatMessage(MESSAGES.stepUserInfo),
            formatMessage(MESSAGES.stepImportBoundaries),
            formatMessage(MESSAGES.stepAccountSettings),
            formatMessage(MESSAGES.stepBudgetSettings),
        ],
        [formatMessage],
    );

    const handleFinish = () => {
        // Mark all steps complete, give the user a brief glimpse of the green
        // ticks, then hard-redirect to the dashboard home.
        setActiveStep(stepLabels.length);
        window.setTimeout(() => {
            window.location.href = HOME_URL;
        }, 300);
    };

    return (
        <Box sx={styles.root}>
            <TopBar
                title={formatMessage(MESSAGES.appName)}
                displayBackButton={false}
                displayMenuButton={false}
                disableShadow
            />
            <Box sx={styles.container}>
                <Box sx={styles.stepperOverlay}>
                    <Box sx={styles.stepper}>
                        <WizardStepper
                            activeStep={activeStep}
                            steps={stepLabels}
                            errorStepIndex={errorStepIndex}
                        />
                    </Box>
                </Box>
                <Paper sx={styles.paper} elevation={0}>
                    {activeStep === 0 && (
                        <UserInfoStep
                            isLastStep={false}
                            onAdvance={() => setActiveStep(1)}
                        />
                    )}
                    {activeStep === 1 && (
                        <ImportBoundariesStep
                            taskId={taskId}
                            onAdvance={() => setActiveStep(2)}
                            onError={onError}
                        />
                    )}
                    {activeStep === 2 && (
                        <AccountSettingsStep
                            isLastStep={false}
                            onAdvance={() => setActiveStep(3)}
                        />
                    )}
                    {activeStep >= 3 && (
                        <BudgetSettingsStep
                            isLastStep
                            onFinish={handleFinish}
                        />
                    )}
                </Paper>
            </Box>
        </Box>
    );
};
