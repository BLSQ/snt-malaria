import React, { FunctionComponent, useCallback, useState } from 'react';

import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import { number, object, string } from 'yup';

import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';

import { WizardStep } from './WizardStep';
import { useGetBudgetSettings } from '../hooks/useGetBudgetSettings';
import { useUpdateBudgetSettings } from '../hooks/useUpdateBudgetSettings';
import { MESSAGES } from '../messages';

type Props = {
    isLastStep: boolean;
    onFinish: () => void;
};

type FormValues = {
    local_currency: string;
    exchange_rate: string;
    inflation_rate: string;
};

const validationSchema = object().shape({
    local_currency: string()
        .nullable()
        .transform(value => (value === '' ? undefined : value))
        .matches(/^[A-Za-z]{3}$/, 'invalidCurrencyCode'),
    exchange_rate: number()
        .typeError('invalidNumber')
        .min(0, 'invalidNumber')
        .required('requiredField'),
    inflation_rate: number()
        .typeError('invalidNumber')
        .min(0, 'invalidNumber')
        .required('requiredField'),
});

export const BudgetSettingsStep: FunctionComponent<Props> = ({
    isLastStep,
    onFinish,
}) => {
    const { formatMessage } = useSafeIntl();

    const { data: budgetSettings, isLoading } = useGetBudgetSettings();
    const { mutateAsync: save, isLoading: isSaving } =
        useUpdateBudgetSettings();

    const [isFinalizing, setIsFinalizing] = useState(false);

    const formik = useFormik<FormValues>({
        initialValues: {
            local_currency: budgetSettings?.local_currency ?? '',
            exchange_rate: budgetSettings?.exchange_rate ?? '1',
            inflation_rate: budgetSettings?.inflation_rate ?? '0',
        },
        enableReinitialize: true,
        validateOnBlur: true,
        validateOnChange: true,
        validationSchema,
        onSubmit: async values => {
            setIsFinalizing(true);
            if (!budgetSettings?.id) {
                onFinish();
                return;
            }
            await save({
                id: budgetSettings.id,
                local_currency: values.local_currency.toUpperCase(),
                exchange_rate: values.exchange_rate,
                inflation_rate: values.inflation_rate,
            });
            onFinish();
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

    const onChange = useCallback(
        (keyValue: string | null, value: any) => {
            if (!keyValue) return;
            setFieldTouched(keyValue, true);
            setFieldValue(keyValue, value ?? '');
        },
        [setFieldTouched, setFieldValue],
    );

    const getErrors = useTranslatedErrors({
        errors,
        formatMessage,
        touched,
        messages: MESSAGES,
    });

    const canSave =
        Boolean(budgetSettings?.id) && !isSaving && !isFinalizing;

    return (
        <WizardStep
            title={formatMessage(MESSAGES.budgetSettingsTitle)}
            description={formatMessage(MESSAGES.budgetSettingsDescription)}
            loading={isLoading}
            isLastStep={isLastStep}
            onSubmit={() => handleSubmit()}
            submitting={isSaving}
            submitDisabled={!canSave || !isValid || isValidating}
            submitDataTestId="configureAccount-budgetsettings-finish"
        >
            <InputComponent
                type="text"
                keyValue="local_currency"
                labelString={formatMessage(MESSAGES.localCurrency)}
                value={values.local_currency}
                onChange={onChange}
                errors={getErrors('local_currency')}
                helperText={formatMessage(MESSAGES.localCurrencyHelp)}
            />
            <InputComponent
                type="number"
                required
                keyValue="exchange_rate"
                labelString={formatMessage(MESSAGES.exchangeRate)}
                value={values.exchange_rate}
                onChange={onChange}
                errors={getErrors('exchange_rate')}
            />
            <InputComponent
                type="number"
                required
                keyValue="inflation_rate"
                labelString={formatMessage(MESSAGES.inflationRate)}
                value={values.inflation_rate}
                onChange={onChange}
                errors={getErrors('inflation_rate')}
                helperText={formatMessage(MESSAGES.inflationRateHelp)}
            />
        </WizardStep>
    );
};
