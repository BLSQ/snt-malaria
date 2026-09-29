import React, { FC, ReactNode, useCallback } from 'react';
import LayersIcon from '@mui/icons-material/Layers';
import {
    Box,
    Button,
    Card,
    Divider,
    Stack,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { SidePanelIconToggle } from '../../../components/sidePanel/SidePanelIconToggle';
import { ExtendedFormikProvider } from '../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../messages';
import { WizardLayerType } from './constants';
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
    title: { fontWeight: 600, flexGrow: 1 },
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
        justifyContent: 'space-between',
    },
    footerActions: { gap: 1 },
    tab: { textTransform: 'none', minHeight: 48 },
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
        goToStep,
        canAdvance,
        isEditing,
        layerType,
        setLayerType,
        staged,
        onCsvFileSelected,
        requestClose,
        submit,
        isSubmitting,
        isCompositeGraphStep,
        existingCodes,
        categoryOptions,
    } = controller;

    const isLastStep = activeStep === lastStep;
    const isTypeStep = activeStep === WIZARD_STEPS.TYPE;

    const onPrimary = useCallback(() => {
        if (isCompositeGraphStep) {
            onCompositeNext?.();
        } else if (isLastStep) {
            submit();
        } else {
            goNext();
        }
    }, [isCompositeGraphStep, isLastStep, onCompositeNext, submit, goNext]);

    const onSelectLayerType = useCallback(
        (value: WizardLayerType) => {
            setLayerType(value);
            goNext();
        },
        [setLayerType, goNext],
    );

    return (
        <Card sx={styles.card}>
            <Stack sx={styles.header}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <SidePanelIconToggle icon={LayersIcon} />
                    <Typography variant="h6" sx={styles.title}>
                        {formatMessage(titleMessage)}
                    </Typography>
                </Stack>
                {isEditing ? (
                    <Tabs
                        value={activeStep}
                        textColor="primary"
                        indicatorColor="primary"
                        onChange={(_event, step) => goToStep(step)}
                    >
                        <Tab
                            value={WIZARD_STEPS.DETAILS}
                            label={formatMessage(MESSAGES.wizardStepDetails)}
                            sx={styles.tab}
                        />
                        <Tab
                            value={WIZARD_STEPS.LEGEND}
                            label={formatMessage(MESSAGES.wizardStepLegend)}
                            sx={styles.tab}
                        />
                    </Tabs>
                ) : (
                    <WizardStepRail
                        activeStep={activeStepIndex}
                        steps={stepLabels}
                    />
                )}
            </Stack>

            <ExtendedFormikProvider formik={formik}>
                {isCompositeGraphStep ? (
                    <Box sx={styles.bodyFlush}>{compositeGraphSlot}</Box>
                ) : (
                    <Box sx={styles.body}>
                        {activeStep === WIZARD_STEPS.TYPE && (
                            <StepType
                                onChangeLayerType={onSelectLayerType}
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
                                codeLocked={isSubmitting}
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

            <Divider />
            <Stack direction="row" sx={styles.footer}>
                <Button onClick={requestClose} disabled={isSubmitting}>
                    {formatMessage(MESSAGES.cancel)}
                </Button>
                {isEditing ? (
                    <Button
                        variant="contained"
                        onClick={submit}
                        disabled={isSubmitting || !formik.isValid}
                    >
                        {formatMessage(MESSAGES.wizardSaveChanges)}
                    </Button>
                ) : (
                    <Stack direction="row" sx={styles.footerActions}>
                        {activeStepIndex > 0 && (
                            <Button onClick={goBack} disabled={isSubmitting}>
                                {formatMessage(MESSAGES.wizardBack)}
                            </Button>
                        )}
                        {!isTypeStep && (
                            <Button
                                variant="contained"
                                onClick={onPrimary}
                                disabled={
                                    isSubmitting ||
                                    (isLastStep
                                        ? !formik.isValid
                                        : !canAdvance)
                                }
                            >
                                {isLastStep
                                    ? formatMessage(MESSAGES.createLayer)
                                    : formatMessage(MESSAGES.wizardNext, {
                                          step: stepLabels[activeStepIndex + 1],
                                      })}
                            </Button>
                        )}
                    </Stack>
                )}
            </Stack>
        </Card>
    );
};
