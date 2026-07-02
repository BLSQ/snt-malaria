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
    start_year: number;
    end_year: number;
    reference_year: number;
};

export const SCENARIO_YEAR_RANGE = {
    min: 2024,
    max: 2035,
} as const;

export const defaultReferenceYear = Math.round(
    (SCENARIO_YEAR_RANGE.min + SCENARIO_YEAR_RANGE.max) / 2,
);

const initialValues: ScenarioFormValues = {
    id: undefined,
    name: '',
    description: '',
    start_year: SCENARIO_YEAR_RANGE.min,
    end_year: SCENARIO_YEAR_RANGE.max,
    reference_year: defaultReferenceYear,
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
                    .min(
                        SCENARIO_YEAR_RANGE.min,
                        formatMessage(MESSAGES.minYear, {
                            year: SCENARIO_YEAR_RANGE.min,
                        }),
                    )
                    .max(
                        SCENARIO_YEAR_RANGE.max,
                        formatMessage(MESSAGES.maxYear, {
                            year: SCENARIO_YEAR_RANGE.max,
                        }),
                    ),
                end_year: Yup.number()
                    .required()
                    .min(
                        SCENARIO_YEAR_RANGE.min,
                        formatMessage(MESSAGES.minYear, {
                            year: SCENARIO_YEAR_RANGE.min,
                        }),
                    )
                    .max(
                        SCENARIO_YEAR_RANGE.max,
                        formatMessage(MESSAGES.maxYear, {
                            year: SCENARIO_YEAR_RANGE.max,
                        }),
                    )
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
                reference_year: Yup.number()
                    .required()
                    .test('reference-year-range', '', function (value) {
                        const { start_year, end_year } = this.parent;
                        const min = start_year ?? SCENARIO_YEAR_RANGE.min;
                        const max = end_year ?? SCENARIO_YEAR_RANGE.max;
                        if (value === undefined || value === null) return true;
                        if (value < min) {
                            return this.createError({
                                message: formatMessage(MESSAGES.minYear, {
                                    year: min,
                                }),
                            });
                        }
                        if (value > max) {
                            return this.createError({
                                message: formatMessage(MESSAGES.maxYear, {
                                    year: max,
                                }),
                            });
                        }
                        return true;
                    }),
            }),
        [formatMessage],
    );
};

export const useScenarioFormState = (
    scenario: Scenario | undefined,
    onSubmit: (values: ScenarioFormValues) => void,
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
                  reference_year:
                      scenario.reference_year ??
                      Math.round((scenario.start_year + scenario.end_year) / 2),
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
