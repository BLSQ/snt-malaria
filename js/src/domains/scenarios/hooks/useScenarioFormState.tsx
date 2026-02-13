import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { MESSAGES } from '../../messages';
import { Scenario } from '../types';

export type ScenarioFormValues = {
    id?: number;
    name: string;
    description: string;
    start_year?: number;
    end_year?: number;
};

const initialValues: ScenarioFormValues = {
    id: undefined,
    name: '',
    description: '',
    start_year: undefined,
    end_year: undefined,
};

const useValidation = () => {
    const { formatMessage } = useSafeIntl();

    return useMemo(
        () =>
            Yup.object({
                name: Yup.string()
                    .max(255)
                    .trim()
                    .required(formatMessage(MESSAGES.required)),
                description: Yup.string(),
                start_year: Yup.number()
                    .required()
                    .min(2024, formatMessage(MESSAGES.minYear, { year: 2024 }))
                    .max(2035, formatMessage(MESSAGES.maxYear, { year: 2035 })),
                end_year: Yup.number()
                    .required()
                    .min(2024, formatMessage(MESSAGES.minYear, { year: 2024 }))
                    .max(2035, formatMessage(MESSAGES.maxYear, { year: 2035 }))
                    .when('start_year', (start_year, schema) => {
                        return start_year
                            ? schema.min(
                                  start_year,
                                  formatMessage(MESSAGES.endYearMin, {
                                      year: start_year,
                                  }),
                              )
                            : schema;
                    }),
            }),
        [formatMessage],
    );
};

export const useScenarioFormState = (
    scenario: Scenario | undefined,
    onSubmit,
) => {
    const validationSchema = useValidation();
    const values = useMemo(() => {
        return scenario
            ? {
                  id: scenario.id,
                  name: scenario.name,
                  description: scenario.description,
                  start_year: scenario.start_year,
                  end_year: scenario.end_year,
              }
            : initialValues;
    }, [scenario]);

    return useFormik({
        initialValues: values,
        validationSchema,
        validateOnBlur: true,
        onSubmit,
    });
};
