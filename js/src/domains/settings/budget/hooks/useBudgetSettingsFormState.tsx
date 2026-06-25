import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { FormikHelpers, useFormik } from 'formik';
import * as Yup from 'yup';
import { MESSAGES } from '../../../messages';
import { BudgetSettingsFormValues } from '../types';

const emptyToNull = (
    value: string | null,
    originalValue: string,
): string | null => (originalValue === '' ? null : value);

const useValidation = () => {
    const { formatMessage } = useSafeIntl();

    return useMemo(
        () =>
            Yup.object().shape({
                local_currency: Yup.string()
                    .nullable()
                    .transform(emptyToNull)
                    .matches(
                        /^[A-Za-z]{3}$/,
                        formatMessage(MESSAGES.budgetInvalidCurrencyCode),
                    ),
                exchange_rate: Yup.number()
                    .typeError(formatMessage(MESSAGES.budgetInvalidNumber))
                    .min(0, formatMessage(MESSAGES.negativeValueNotAllowed))
                    .required(formatMessage(MESSAGES.required)),
                inflation_rate: Yup.number()
                    .typeError(formatMessage(MESSAGES.budgetInvalidNumber))
                    .min(0, formatMessage(MESSAGES.negativeValueNotAllowed))
                    .required(formatMessage(MESSAGES.required)),
                buffer: Yup.number()
                    .typeError(formatMessage(MESSAGES.budgetInvalidNumber))
                    .min(0, formatMessage(MESSAGES.negativeValueNotAllowed))
                    .required(formatMessage(MESSAGES.required)),
            }),
        [formatMessage],
    );
};

export const useBudgetSettingsFormState = ({
    onSubmit,
    initialValues,
}: {
    onSubmit: (
        values: BudgetSettingsFormValues,
        formikHelpers?: FormikHelpers<BudgetSettingsFormValues>,
    ) => void;
    initialValues: BudgetSettingsFormValues;
}) => {
    const validationSchema = useValidation();
    const formik = useFormik({
        initialValues,
        validationSchema,
        enableReinitialize: true,
        onSubmit,
    });

    return formik;
};
