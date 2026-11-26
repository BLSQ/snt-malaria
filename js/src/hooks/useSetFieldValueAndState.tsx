import { useCallback } from 'react';

type useSetFieldValueAndStateProps = {
    setFieldTouched: (
        field: string,
        isTouched?: boolean | undefined,
        shouldValidate?: boolean | undefined,
    ) => Promise<unknown>;
    setFieldValue: (
        field: string,
        value: any,
        shouldValidate?: boolean | undefined,
    ) => Promise<unknown>;
};

export const useSetFieldValueAndState = ({
    setFieldTouched,
    setFieldValue,
}: useSetFieldValueAndStateProps) =>
    useCallback(
        (field: string, value: any) => {
            setFieldTouched(field, true, false);
            setFieldValue(field, value);
        },
        [setFieldTouched, setFieldValue],
    );

export const useSetChildFieldValueAndState = ({
    setFieldTouched,
    setFieldValue,
}: useSetFieldValueAndStateProps) => {
    const setFieldValueAndState = useSetFieldValueAndState({
        setFieldTouched,
        setFieldValue,
    });
    return useCallback(
        (key: string, index: number, field: string, value: any) =>
            setFieldValueAndState(`${key}[${index}].${field}`, value),
        [setFieldValueAndState],
    );
};
