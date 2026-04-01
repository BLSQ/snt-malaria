import { useCallback, useEffect, useMemo } from 'react';
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
    is_match_all: boolean;
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
    scenario: 0,
    name: '',
    color: '#000000',
    is_match_all: false,
    intervention_properties: [],
    matching_criteria: [],
};

const useValidation = () => {
    const { formatMessage } = useSafeIntl();

    return useMemo(
        () =>
            Yup.object().shape({
                name: Yup.string().required(formatMessage(MESSAGES.required)),
                is_match_all: Yup.boolean(),
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
                    .when('is_match_all', {
                        is: false,
                        then: schema =>
                            schema.test(
                                'criteria-or-inclusions',
                                'required',
                                function test(value) {
                                    const { org_units_included } =
                                        this.parent;
                                    if (
                                        org_units_included &&
                                        String(org_units_included).length > 0
                                    )
                                        return true;
                                    return (value ?? []).length >= 1;
                                },
                            ),
                    }),
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

    return { ...formik };
};
