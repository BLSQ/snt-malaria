import { useCallback } from 'react';
import { FormikErrors, FormikTouched } from 'formik';

type getChildErrorParams<T> = {
    errors: string | string[] | FormikErrors<T>[] | undefined;
    touched: FormikTouched<T>[] | undefined;
};
export const useGetChildError = <T,>({
    errors,
    touched,
}: getChildErrorParams<T>) =>
    useCallback(
        (field: string, index: number) =>
            touched?.[index]?.[field] && errors?.[index]?.[field]
                ? [errors[index][field]]
                : [],
        [errors, touched],
    );
