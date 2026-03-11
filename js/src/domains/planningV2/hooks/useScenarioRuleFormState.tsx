import { useCallback, useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { FormikHelpers, useFormik } from 'formik';
import * as Yup from 'yup';
import { MESSAGES } from '../../messages';
import {
    InterventionProperties,
    MetricTypeCriterion,
} from '../types/scenarioRule';

export type ScenarioRuleFormValues = {
    id?: number;
    name: string;
    scenario: number;
    color: string;
    intervention_properties: InterventionProperties[];
    matching_criteria: MetricTypeCriterion[];
    org_units_excluded?: string; // comma separated list of org unit ids
    org_units_included?: string; // comma separated list of org unit ids
};

export const defaultMatchingCriteria: MetricTypeCriterion = {
    metric_type: undefined,
    operator: '>',
    value: 0,
    string_value: '',
};

export const defaultInterventionProperties: InterventionProperties = {
    intervention: undefined,
    category: undefined,
    coverage: 0,
};

export const defaultScenarioRuleValues: ScenarioRuleFormValues = {
    name: '',
    color: '#000000',
    intervention_properties: [],
    matching_criteria: [],
};

const useValidation = () => {
    const { formatMessage } = useSafeIntl();

    return useMemo(
        () =>
            Yup.object().shape({
                name: Yup.string().required(formatMessage(MESSAGES.required)),
                intervention_properties: Yup.array()
                    .of(
                        Yup.object().shape({
                            category: Yup.number().required(),
                            intervention: Yup.number().required(),
                        }),
                    )
                    .min(1),
                matching_criteria: Yup.array()
                    .of(
                        Yup.object().shape({
                            metric_type: Yup.number().required(),
                            operator: Yup.string().required(),
                            value: Yup.number(),
                            string_value: Yup.string(),
                        }),
                    )
                    .min(1),
            }),
        [formatMessage],
    );
};

export const useScenarioRuleFormState = ({
    onSubmit,
    initialValues,
    editMode = false,
}: {
    onSubmit: (
        values: Partial<ScenarioRuleFormValues>,
        formikHelpers?: FormikHelpers<ScenarioRuleFormValues>,
    ) => void;
    initialValues?: ScenarioRuleFormValues;
    editMode?: boolean;
}) => {
    const validationSchema = useValidation();

    const getModifiedValues = useCallback(
        (values: ScenarioRuleFormValues) => {
            if (!initialValues || !editMode) return values;

            return Object.entries(values).reduce((acc, [key, value]) => {
                if (key === 'id' || key === 'scenario') {
                    (acc as any)[key] = value;
                } else if (
                    JSON.stringify(value) !==
                    JSON.stringify(
                        initialValues[key as keyof ScenarioRuleFormValues],
                    )
                ) {
                    (acc as any)[key] = value;
                }
                return acc;
            }, {} as Partial<ScenarioRuleFormValues>);
        },
        [initialValues, editMode],
    );

    const submitModifiedValues = useCallback(
        (
            values: ScenarioRuleFormValues,
            formikHelpers: FormikHelpers<ScenarioRuleFormValues>,
        ) => {
            const modifiedValues = getModifiedValues(values);
            onSubmit(modifiedValues, formikHelpers);
        },
        [getModifiedValues, onSubmit],
    );

    const formik = useFormik({
        initialValues: initialValues || defaultScenarioRuleValues,
        validationSchema,
        onSubmit: submitModifiedValues,
    });

    return formik;
};
