import { useFormikContext } from 'formik';
import { useAddChildValue } from './useAddChildValue';
import { useRemoveChildValue } from './useRemoveChildValue';
import {
    useSetChildFieldValueAndState,
    useSetFieldValueAndState,
} from './useSetFieldValueAndState';

export const useGetExtendedFormikContext = <T,>() => {
    const { values, setFieldValue, errors, touched, setFieldTouched } =
        useFormikContext<T>();

    const setFieldValueAndState = useSetFieldValueAndState({
        setFieldTouched,
        setFieldValue,
    });

    const setChildFieldValueAndState = useSetChildFieldValueAndState({
        setFieldTouched,
        setFieldValue,
    });

    const removeChildValue = useRemoveChildValue(values, setFieldValue);

    const addChildValue = useAddChildValue(values, setFieldValue);

    return {
        values,
        setFieldValue,
        errors,
        touched,
        setFieldTouched,
        setFieldValueAndState,
        setChildFieldValueAndState,
        removeChildValue,
        addChildValue,
    };
};
