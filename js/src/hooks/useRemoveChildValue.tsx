import { useCallback } from 'react';
import { FormikErrors } from 'formik';

export const useRemoveChildValue = <T,>(
    values: T,
    setFieldValue: (
        field: string,
        value: any,
        shouldValidate?: boolean | undefined,
    ) => Promise<void | FormikErrors<T>>,
) =>
    useCallback(
        (key: string, index: number) => {
            const newValue = [...values[key]];
            newValue.splice(index, 1);
            setFieldValue(key, newValue);
        },
        [values, setFieldValue],
    );
