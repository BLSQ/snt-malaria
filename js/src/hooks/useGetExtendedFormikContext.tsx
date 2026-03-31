import React, { createContext, useContext } from 'react';
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
};

const ExtendedFormikContext = createContext<ExtendedFormikContextType>(
    {} as ExtendedFormikContextType,
);

export const ExtendedFormikProvider = ({
    children,
    formik,
}: {
    children: React.ReactNode;
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

    const extendedContext = {
        setFieldValueAndState,
        setChildFieldValueAndState,
        removeChildValue,
        addChildValue,
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
