import { useCallback } from 'react';
import { FormikErrors } from 'formik';

export const useAddChildValue = <T,>(
    values: T,
    setFieldValue: (
        field: string,
        value: any,
        shouldValidate?: boolean | undefined,
    ) => Promise<void | FormikErrors<T>>,
) =>
    useCallback(
        (key: string, defaultValue: any, extendedValues?: any) => {
            const newValue = [
                ...values[key],
                { ...defaultValue, ...extendedValues },
            ];
            setFieldValue(key, newValue);
        },
        [values, setFieldValue],
    );
