import React, { FC, ReactNode, useCallback } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import {
    Alert,
    Box,
    Button,
    Card,
    Divider,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { ExtendedFormikProvider } from '../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../messages';
import { StepDataControls } from './steps/StepDataControls';
import { StepDetails } from './steps/StepDetails';
import { StepLegend } from './steps/StepLegend';
import { StepType } from './steps/StepType';
import { WIZARD_STEPS } from './useDataLayerWizard';
import { DataLayerWizardController } from './useDataLayerWizardController';
import { WizardMapPreview } from './useWizardMapPreview';
import { WizardStepRail } from './WizardStepRail';

const styles: SxStyles = {
    card: { height: '100%', display: 'flex', flexDirection: 'column' },
    header: {
        p: 2,
        pb: 1.5,
        gap: 1.5,
    },
    headerRow: { alignItems: 'center' },
    title: { flexGrow: 1, fontWeight: 600 },
    body: { flexGrow: 1, overflow: 'auto', p: 2 },
    bodyFlush: {
        flexGrow: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
    },
    footer: {
        p: 2,
        gap: 1,
        justifyContent: 'flex-end',
    },
};

type Props = {
    controller: DataLayerWizardController;
    preview: WizardMapPreview;
    showOpenHexa: boolean;
    showComposite: boolean;
    orgUnits: OrgUnit[];
    compositeGraphSlot?: ReactNode;
    onCompositeNext?: () => void;
};

export const DataLayerWizardPanel: FC<Props> = ({
    controller,
    preview,
    showOpenHexa,
    showComposite,
    orgUnits,
    compositeGraphSlot,
    onCompositeNext,
}) => {
    const { formatMessage } = useSafeIntl();
    const {
        formik,
        stepLabels,
        titleMessage,
        activeStep,
        activeStepIndex,
        lastStep,
        goNext,
        goBack,
        canAdvance,
        isEditing,
        layerType,
        setLayerType,
        staged,
        onCsvFileSelected,
        requestClose,
        submit,
        isSubmitting,
        submitError,
        clearSubmitError,
        isCompositeGraphStep,
        existingCodes,
        categoryOptions,
    } = controller;

    const isLastStep = activeStep === lastStep;

    const onPrimary = useCallback(() => {
        if (isCompositeGraphStep) {
            onCompositeNext?.();
        } else if (isLastStep) {
            submit();
        } else {
            goNext();
        }
    }, [isCompositeGraphStep, isLastStep, onCompositeNext, submit, goNext]);

    const onBack = useCallback(() => {
        clearSubmitError();
        goBack();
    }, [clearSubmitError, goBack]);

    return (
        <Card sx={styles.card}>
            <Stack sx={styles.header}>
                <Stack direction="row" sx={styles.headerRow}>
                    <Typography variant="h6" sx={styles.title}>
                        {formatMessage(titleMessage)}
                    </Typography>
                    <IconButton size="small" onClick={requestClose}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>
                <WizardStepRail
                    activeStep={activeStepIndex}
                    steps={stepLabels}
                />
            </Stack>
            <Divider />

            <ExtendedFormikProvider formik={formik}>
                {isCompositeGraphStep ? (
                    <Box sx={styles.bodyFlush}>{compositeGraphSlot}</Box>
                ) : (
                    <Box sx={styles.body}>
                        {activeStep === WIZARD_STEPS.TYPE && (
                            <StepType
                                layerType={layerType}
                                onChangeLayerType={setLayerType}
                                showOpenHexa={showOpenHexa}
                                showComposite={showComposite}
                            />
                        )}
                        {activeStep === WIZARD_STEPS.DETAILS && (
                            <StepDetails
                                layerType={layerType}
                                categoryOptions={categoryOptions}
                                existingCodes={existingCodes}
                                isEditing={isEditing}
                                codeLocked={Boolean(staged.createdMetricTypeId)}
                            />
                        )}
                        {activeStep === WIZARD_STEPS.DATA && (
                            <StepDataControls
                                layerType={layerType}
                                onUploadCsv={onCsvFileSelected}
                                years={staged.gridYears}
                                orgUnits={orgUnits}
                                openHexaStatus={preview.openHexaStatus}
                            />
                        )}
                        {activeStep === WIZARD_STEPS.LEGEND && (
                            <StepLegend layerType={layerType} />
                        )}
                    </Box>
                )}
            </ExtendedFormikProvider>

            {submitError && (
                <Alert severity="error" sx={{ mx: 2, mb: 1 }}>
                    {formatMessage(submitError)}
                </Alert>
            )}

            <Divider />
            <Stack direction="row" sx={styles.footer}>
                {activeStepIndex > 0 && (
                    <Button onClick={onBack} disabled={isSubmitting}>
                        {formatMessage(MESSAGES.wizardBack)}
                    </Button>
                )}
                <Button
                    variant="contained"
                    onClick={onPrimary}
                    disabled={
                        isSubmitting ||
                        (isLastStep ? !formik.isValid : !canAdvance)
                    }
                >
                    {isLastStep
                        ? formatMessage(
                              isEditing
                                  ? MESSAGES.wizardSaveChanges
                                  : MESSAGES.createLayer,
                          )
                        : formatMessage(MESSAGES.wizardNext, {
                              step: stepLabels[activeStepIndex + 1],
                          })}
                </Button>
            </Stack>
        </Card>
    );
};
