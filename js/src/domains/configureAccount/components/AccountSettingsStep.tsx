import React, { FunctionComponent, useMemo } from 'react';

import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import { number, object } from 'yup';

import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';

import { WizardStep } from './WizardStep';
import { useGetAccountSettings } from '../hooks/useGetAccountSettings';
import {
    OrgUnitTypeOption,
    useGetOrgUnitTypes,
} from '../hooks/useGetOrgUnitTypes';
import { useUpdateAccountSettings } from '../hooks/useUpdateAccountSettings';
import { MESSAGES } from '../messages';

type Props = {
    isLastStep: boolean;
    onAdvance: () => void;
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
    isLastStep,
    onAdvance,
}) => {
    const { formatMessage } = useSafeIntl();

    const { data: orgUnitTypes, isFetching: isFetchingTypes } =
        useGetOrgUnitTypes(true);
    const { data: accountSettings } = useGetAccountSettings(true);

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
