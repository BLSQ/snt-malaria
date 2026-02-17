import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { MESSAGES } from '../../messages';
import {
    InterventionProperties,
    MetricTypeCriterion,
} from '../types/scenarioRule';

export type ScenarioRuleFormValues = {
    id?: number;
    name: string;
    color: string;
    intervention_properties: InterventionProperties[];
    metric_criteria: MetricTypeCriterion[];
};

export const defaultMetricCriteria: MetricTypeCriterion = {
    metric_type: undefined,
    operator: '>',
    value: 0,
    string_value: '',
};

export const defaultInterventionProperties: InterventionProperties = {
    intervention: undefined,
    intervention_category: undefined,
};

const defaultValues: ScenarioRuleFormValues = {
    name: '',
    color: '#000000',
    intervention_properties: [],
    metric_criteria: [],
};

const useValidation = () => {
    const { formatMessage } = useSafeIntl();

    return useMemo(
        () =>
            Yup.object().shape({
                name: Yup.string().required(formatMessage(MESSAGES.required)),
                intervention_properties: Yup.array().of(
                    Yup.object().shape({
                        intervention_category: Yup.number().required(),
                        intervention: Yup.number().required(),
                    }),
                ),
                metric_criteria: Yup.array().of(
                    Yup.object().shape({
                        metric_type: Yup.number().required(),
                        operator: Yup.string().required(),
                        value: Yup.number(),
                        string_value: Yup.string(),
                    }),
                ),
            }),
        [formatMessage],
    );
};

export const useScenarioRuleFormState = ({
    onSubmit,
    initialValues,
}: {
    onSubmit: (values: ScenarioRuleFormValues) => void;
    initialValues?: ScenarioRuleFormValues;
}) => {
    const validationSchema = useValidation();
    return useFormik({
        initialValues: initialValues || defaultValues,
        validationSchema,
        onSubmit: onSubmit,
    });
};
