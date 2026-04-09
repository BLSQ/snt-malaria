import { useCallback } from 'react';
import { FormikErrors } from 'formik';
import { ScenarioRuleFormValues } from '../domains/planning/hooks/useScenarioRuleFormState';

type useSetFieldValueAndStateProps = {
    setFieldTouched: (
        field: string | null,
        isTouched?: boolean | undefined,
        shouldValidate?: boolean | undefined,
    ) => Promise<void | FormikErrors<ScenarioRuleFormValues>>;
    setFieldValue: (
        field: string | null,
        value: any,
        shouldValidate?: boolean | undefined,
    ) => Promise<void | FormikErrors<ScenarioRuleFormValues>>;
};

export const useSetFieldValueAndState = ({
    setFieldTouched,
    setFieldValue,
}: useSetFieldValueAndStateProps) =>
    useCallback(
        (field: string | null, value: any) => {
            setFieldTouched(field, true);
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
        (key: string, index: number, field: string | null, value: any) =>
            setFieldValueAndState(`${key}[${index}].${field}`, value),
        [setFieldValueAndState],
    );
};
