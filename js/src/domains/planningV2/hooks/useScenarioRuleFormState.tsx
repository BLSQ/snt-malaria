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
    name: string;
    color: string;
    intervention_properties: InterventionProperties[];
    metric_criteria: MetricTypeCriterion[];
};

export const defaultMetricCriteria: MetricTypeCriterion = {
    metricType: undefined,
    operator: '>',
    value: 0,
    string_value: '',
};

export const defaultInterventionProperties: InterventionProperties = {
    intervention: undefined,
    interventionCategory: undefined,
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
                        interventionCategory: Yup.number().required(
                            formatMessage(MESSAGES.required),
                        ),
                        intervention: Yup.number().required(
                            formatMessage(MESSAGES.required),
                        ),
                    }),
                ),
                metricTypeRules: Yup.array().of(
                    Yup.object().shape({
                        metricType: Yup.number().required(
                            formatMessage(MESSAGES.required),
                        ),
                        operator: Yup.string().required(
                            formatMessage(MESSAGES.required),
                        ),
                        value: Yup.number(),
                        // .required(
                        //     formatMessage(MESSAGES.required),
                        // ),
                        string_value: Yup.string(),
                    }),
                ),
            }),
        [formatMessage],
    );
};

export const useScenarioRuleFormState = ({ onSubmit }) => {
    const validationSchema = useValidation();
    return useFormik({
        initialValues: defaultValues,
        validationSchema,
        onSubmit: onSubmit,
    });
};
