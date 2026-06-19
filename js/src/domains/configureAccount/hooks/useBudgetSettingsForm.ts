import { useCallback, useState } from 'react';

import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';

import { useTranslatedErrors } from 'Iaso/libs/validation';

import { MESSAGES } from '../messages';
import {
    budgetSettingsValidationSchema,
    BudgetSettingsFormValues,
} from './useBudgetSettingsValidation';
import { useGetBudgetSettings } from './useGetBudgetSettings';
import { useUpdateBudgetSettings } from './useUpdateBudgetSettings';

type UseBudgetSettingsFormResult = {
    isLoading: boolean;
    isSaving: boolean;
    canSave: boolean;
    values: BudgetSettingsFormValues;
    isValid: boolean;
    isValidating: boolean;
    handleSubmit: () => void;
    onChange: (keyValue: string | null, value: unknown) => void;
    getErrors: (field: keyof BudgetSettingsFormValues) => string[];
};

export const useBudgetSettingsForm = (
    onFinish: () => void,
): UseBudgetSettingsFormResult => {
    const { formatMessage } = useSafeIntl();

    const { data: budgetSettings, isLoading } = useGetBudgetSettings();
    const { mutateAsync: save, isLoading: isSaving } =
        useUpdateBudgetSettings();

    const [isFinalizing, setIsFinalizing] = useState(false);

    const {
        values,
        errors,
        touched,
        isValid,
        isValidating,
        setFieldValue,
        setFieldTouched,
        handleSubmit,
    } = useFormik<BudgetSettingsFormValues>({
        initialValues: {
            local_currency: budgetSettings?.local_currency ?? '',
            exchange_rate: budgetSettings?.exchange_rate ?? '1',
            inflation_rate: budgetSettings?.inflation_rate ?? '0',
        },
        enableReinitialize: true,
        validateOnBlur: true,
        validateOnChange: true,
        validationSchema: budgetSettingsValidationSchema,
        onSubmit: async formValues => {
            setIsFinalizing(true);
            if (!budgetSettings?.id) {
                onFinish();
                return;
            }
            await save({
                id: budgetSettings.id,
                local_currency: formValues.local_currency.toUpperCase(),
                exchange_rate: formValues.exchange_rate,
                inflation_rate: formValues.inflation_rate,
            });
            onFinish();
        },
    });

    const onChange = useCallback(
        (keyValue: string | null, value: unknown) => {
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

    return {
        isLoading,
        isSaving,
        canSave: Boolean(budgetSettings?.id) && !isSaving && !isFinalizing,
        values,
        isValid,
        isValidating,
        handleSubmit: () => {
            void handleSubmit();
        },
        onChange,
        getErrors,
    };
};
