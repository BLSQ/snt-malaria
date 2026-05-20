import { number, object, string } from 'yup';

export type BudgetSettingsFormValues = {
    local_currency: string;
    exchange_rate: string;
    inflation_rate: string;
};

export const budgetSettingsValidationSchema = object().shape({
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
