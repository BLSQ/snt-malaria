import React, { createContext, useCallback, useContext } from 'react';
import { FormikProvider, useFormikContext } from 'formik';
import { useAddChildValue } from './useAddChildValue';
import { useRemoveChildValue } from './useRemoveChildValue';
import {
    useSetChildFieldValueAndState,
    useSetFieldValueAndState,
} from './useSetFieldValueAndState';

type ExtendedFormikContextType = {
    setFieldValueAndState: ReturnType<typeof useSetFieldValueAndState>;
    setChildFieldValueAndState: ReturnType<
        typeof useSetChildFieldValueAndState
    >;
    removeChildValue: ReturnType<typeof useRemoveChildValue>;
    addChildValue: ReturnType<typeof useAddChildValue>;
    handleBlur: (field: string) => void;
};

const ExtendedFormikContext = createContext<ExtendedFormikContextType>(
    {} as ExtendedFormikContextType,
);

export const ExtendedFormikProvider = ({
    children,
    onBlur,
    formik,
}: {
    children: React.ReactNode;
    onBlur: (field: string) => void;
    formik: any;
}) => {
    const setFieldValueAndState = useSetFieldValueAndState({
        setFieldTouched: formik.setFieldTouched,
        setFieldValue: formik.setFieldValue,
    });

    const setChildFieldValueAndState = useSetChildFieldValueAndState({
        setFieldTouched: formik.setFieldTouched,
        setFieldValue: formik.setFieldValue,
    });

    const removeChildValue = useRemoveChildValue(
        formik.values,
        formik.setFieldValue,
    );

    const addChildValue = useAddChildValue(formik.values, formik.setFieldValue);

    const handleBlur = useCallback(
        (field: string) => {
            formik.setFieldTouched(field, true);
            onBlur(field);
        },
        [onBlur, formik],
    );

    const extendedContext = {
        setFieldValueAndState,
        setChildFieldValueAndState,
        removeChildValue,
        addChildValue,
        handleBlur,
    };

    return (
        <FormikProvider value={formik}>
            <ExtendedFormikContext.Provider value={extendedContext}>
                {children}
            </ExtendedFormikContext.Provider>
        </FormikProvider>
    );
};

export const useGetExtendedFormikContext = <T,>() => ({
    ...useFormikContext<T>(),
    ...useContext(ExtendedFormikContext),
});
