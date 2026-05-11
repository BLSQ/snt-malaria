import React, { FunctionComponent, useEffect, useMemo } from 'react';

import { Box, LinearProgress, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import { MessageDescriptor } from 'react-intl';
import { number, object } from 'yup';

import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { SxStyles } from 'Iaso/types/general';

import { baseUrls } from '../../../constants/urls';
import { WizardStep } from './WizardStep';
import { useGetAccountSettings } from '../hooks/useGetAccountSettings';
import {
    OrgUnitTypeOption,
    useGetOrgUnitTypes,
} from '../hooks/useGetOrgUnitTypes';
import { usePollTask } from '../hooks/usePollTask';
import { useUpdateAccountSettings } from '../hooks/useUpdateAccountSettings';
import { MESSAGES } from '../messages';

type Props = {
    taskId: number | undefined;
    isLastStep: boolean;
    onAdvance: () => void;
    /** Notifies the wizard stepper when this step is in a blocking error state. */
    onStepErrorChange?: (hasError: boolean) => void;
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
// setup page. The path is allow-listed in the snt_malaria plugin settings so
// `IasoLogoutView` accepts it.
const RESTART_URL = `/logout-iaso?next=${encodeURIComponent(`/${baseUrls.setupAccount}`)}`;

const goToRestart = (): void => {
    window.location.assign(RESTART_URL);
};

type FormValues = {
    focus_org_unit_type_id: number | undefined;
    intervention_org_unit_type_id: number | undefined;
};

const validationSchema = object().shape({
    focus_org_unit_type_id: number().nullable().required('requiredField'),
    intervention_org_unit_type_id: number()
        .nullable()
        .required('requiredField'),
});

/** Picks default OU type ids: intervention = max depth, focus = next lower depth. */
const computeDefaultOrgUnitTypeIds = (
    orgUnitTypes: OrgUnitTypeOption[] | undefined,
): {
    focus: number | undefined;
    intervention: number | undefined;
} => {
    if (!orgUnitTypes || orgUnitTypes.length === 0) {
        return { focus: undefined, intervention: undefined };
    }
    const sorted = orgUnitTypes
        .filter(t => typeof t.depth === 'number')
        .sort((a, b) => (b.depth as number) - (a.depth as number));
    if (sorted.length === 0) {
        return { focus: undefined, intervention: undefined };
    }
    const deepest = sorted[0];
    const oneUp = sorted.find(
        t => (t.depth as number) < (deepest.depth as number),
    );
    return {
        intervention: deepest.value,
        focus: oneUp?.value,
    };
};

export const AccountSettingsStep: FunctionComponent<Props> = ({
    taskId,
    isLastStep,
    onAdvance,
    onStepErrorChange,
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
        onStepErrorChange?.(hasStepperError);
        return () => {
            onStepErrorChange?.(false);
        };
    }, [hasStepperError, onStepErrorChange]);

    const { data: orgUnitTypes, isFetching: isFetchingTypes } =
        useGetOrgUnitTypes(importDone);
    const { data: accountSettings } = useGetAccountSettings(importDone);

    const { mutateAsync: saveSettings, isLoading: isSaving } =
        useUpdateAccountSettings();

    const defaults = useMemo(
        () => computeDefaultOrgUnitTypeIds(orgUnitTypes),
        [orgUnitTypes],
    );

    const formik = useFormik<FormValues>({
        initialValues: {
            focus_org_unit_type_id:
                accountSettings?.focus_org_unit_type_id ?? defaults.focus,
            intervention_org_unit_type_id:
                accountSettings?.intervention_org_unit_type_id ??
                defaults.intervention,
        },
        enableReinitialize: true,
        validateOnBlur: true,
        validateOnChange: true,
        validationSchema,
        onSubmit: async values => {
            if (!accountSettings?.id) return;
            await saveSettings({
                id: accountSettings.id,
                focus_org_unit_type_id: values.focus_org_unit_type_id as number,
                intervention_org_unit_type_id:
                    values.intervention_org_unit_type_id as number,
            });
            onAdvance();
        },
    });

    const {
        values,
        errors,
        touched,
        isValid,
        isValidating,
        setFieldValue,
        setFieldTouched,
        handleSubmit,
    } = formik;

    const onChange = (keyValue: string | null, value: any) => {
        if (!keyValue) return;
        setFieldTouched(keyValue, true);
        const processed =
            value === '' || value === null || value === undefined
                ? undefined
                : Number(value);
        setFieldValue(keyValue, processed);
    };

    const getErrors = useTranslatedErrors({
        errors,
        formatMessage,
        touched,
        messages: MESSAGES,
    });

    const stepErrorWithHelp = (specific: MessageDescriptor): string =>
        `${formatMessage(specific)} ${formatMessage(MESSAGES.errorHelpSuffix)}`;

    if (!taskId) {
        return (
            <WizardStep
                title={formatMessage(MESSAGES.configureTitle)}
                onSubmit={goToRestart}
                submitLabel={formatMessage(MESSAGES.restart)}
                submitDataTestId="configureAccount-accountsettings-restart"
            >
                <Typography sx={styles.error}>
                    {stepErrorWithHelp(MESSAGES.missingTaskId)}
                </Typography>
            </WizardStep>
        );
    }

    if (!importDone) {
        const progressValue =
            task && task.end_value > 0
                ? Math.min(100, (task.progress_value / task.end_value) * 100)
                : 0;

        return (
            <WizardStep
                title={formatMessage(MESSAGES.importTitle)}
                description={formatMessage(MESSAGES.importDescription)}
                onSubmit={
                    importTerminalFailure ? goToRestart : undefined
                }
                submitLabel={
                    importTerminalFailure
                        ? formatMessage(MESSAGES.restart)
                        : undefined
                }
                submitDataTestId={
                    importTerminalFailure
                        ? 'configureAccount-accountsettings-restart'
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
    }

    const canSave = Boolean(accountSettings?.id) && !isSaving;

    return (
        <WizardStep
            title={formatMessage(MESSAGES.configureTitle)}
            description={formatMessage(MESSAGES.configureDescription)}
            isLastStep={isLastStep}
            onSubmit={() => handleSubmit()}
            submitting={isSaving}
            submitDisabled={!canSave || !isValid || isValidating}
            submitDataTestId="configureAccount-accountsettings-next"
        >
            <InputComponent
                type="select"
                required
                keyValue="intervention_org_unit_type_id"
                labelString={formatMessage(MESSAGES.interventionOrgUnitType)}
                value={values.intervention_org_unit_type_id}
                onChange={onChange}
                errors={getErrors('intervention_org_unit_type_id')}
                options={orgUnitTypes ?? []}
                loading={isFetchingTypes}
                clearable={false}
                helperText={formatMessage(
                    MESSAGES.interventionOrgUnitTypeHelp,
                )}
            />
            <InputComponent
                type="select"
                required
                keyValue="focus_org_unit_type_id"
                labelString={formatMessage(MESSAGES.focusOrgUnitType)}
                value={values.focus_org_unit_type_id}
                onChange={onChange}
                errors={getErrors('focus_org_unit_type_id')}
                options={orgUnitTypes ?? []}
                loading={isFetchingTypes}
                clearable={false}
                helperText={formatMessage(MESSAGES.focusOrgUnitTypeHelp)}
            />
        </WizardStep>
    );
};
