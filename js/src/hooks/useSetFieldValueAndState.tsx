import { useCallback } from 'react';
import { FormikErrors } from 'formik';
import { ScenarioRuleFormValues } from '../domains/planningV2/hooks/useScenarioRuleFormState';

type useSetFieldValueAndStateProps = {
    setFieldTouched: (
        field: string,
        isTouched?: boolean | undefined,
        shouldValidate?: boolean | undefined,
    ) => Promise<void | FormikErrors<ScenarioRuleFormValues>>;
    setFieldValue: (
        field: string,
        value: any,
        shouldValidate?: boolean | undefined,
    ) => Promise<void | FormikErrors<ScenarioRuleFormValues>>;
};

export const useSetFieldValueAndState = ({
    setFieldTouched,
    setFieldValue,
}: useSetFieldValueAndStateProps) =>
    useCallback(
        (field: string, value: any) => {
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
        (key: string, index: number, field: string, value: any) =>
            setFieldValueAndState(`${key}[${index}].${field}`, value),
        [setFieldValueAndState],
    );
};
