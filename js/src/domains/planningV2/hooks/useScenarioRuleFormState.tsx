import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { MESSAGES } from '../../messages';
import {
    InterventionCriteria,
    MetricTypeCriteria,
} from '../types/scenarioRule';

export type ScenarioRuleFormValues = {
    name: string;
    color: string;
    interventionRules: InterventionCriteria[];
    metricTypeRules: MetricTypeCriteria[];
};

export const defaultMetricRule: MetricTypeCriteria = {
    metricType: undefined,
    operator: '>',
    value: 0,
    string_value: '',
};

export const defaultInterventionRule: InterventionCriteria = {
    intervention: undefined,
    interventionCategory: undefined,
    coverage: 70,
};

const defaultValues: ScenarioRuleFormValues = {
    name: '',
    color: '#000000',
    interventionRules: [],
    metricTypeRules: [],
};

const useValidation = () => {
    const { formatMessage } = useSafeIntl();

    return useMemo(
        () =>
            Yup.object().shape({
                name: Yup.string().required(formatMessage(MESSAGES.required)),
                intervention_rules: Yup.array().of(
                    Yup.object().shape({
                        interventionCategory: Yup.number().required(
                            formatMessage(MESSAGES.required),
                        ),
                        intervention: Yup.number().required(
                            formatMessage(MESSAGES.required),
                        ),
                        coverage: Yup.number().required(
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
