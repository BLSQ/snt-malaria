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
    // Frontend-only convenience: the year applied to every data layer that has no
    // entry in `data_layer_years`. Not persisted as its own backend field - it gets
    // flattened into `data_layer_years` at submit time, see `buildDataLayerYears`.
    reference_year?: number;
    data_layer_years: Record<string, number>;
};

export const SCENARIO_YEAR_RANGE = {
    min: 2024,
    max: 2035,
} as const;

const initialValues: ScenarioFormValues = {
    id: undefined,
    name: '',
    description: '',
    start_year: SCENARIO_YEAR_RANGE.min,
    end_year: SCENARIO_YEAR_RANGE.max,
    reference_year: undefined,
    data_layer_years: {},
};

/**
 * Builds the flat `data_layer_years` payload sent to the backend: the reference
 * year applied to every known data layer, with per-layer overrides on top. When
 * no reference year is set, only the explicit overrides are sent (a layer with
 * no entry has no year filter applied, i.e. all years are considered).
 */
export const buildDataLayerYears = (
    referenceYear: number | undefined,
    overrides: Record<string, number>,
    metricTypeIds: number[],
): Record<string, number> => {
    if (referenceYear === undefined) {
        return overrides;
    }
    const defaults = Object.fromEntries(
        metricTypeIds.map(id => [String(id), referenceYear]),
    );
    return { ...defaults, ...overrides };
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
                            year: SCENARIO_YEAR_RANGE.min.toString(),
                        }),
                    )
                    .max(
                        SCENARIO_YEAR_RANGE.max,
                        formatMessage(MESSAGES.maxYear, {
                            year: SCENARIO_YEAR_RANGE.max.toString(),
                        }),
                    ),
                end_year: Yup.number()
                    .required()
                    .min(
                        SCENARIO_YEAR_RANGE.min,
                        formatMessage(MESSAGES.minYear, {
                            year: SCENARIO_YEAR_RANGE.min.toString(),
                        }),
                    )
                    .max(
                        SCENARIO_YEAR_RANGE.max,
                        formatMessage(MESSAGES.maxYear, {
                            year: SCENARIO_YEAR_RANGE.max.toString(),
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
                reference_year: Yup.number().nullable(),
                data_layer_years: Yup.object(),
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
        if (!scenario) {
            return initialValues;
        }
        // reference_year stays unset: there's no way to tell a "same year everywhere"
        // dict apart from a few coincidental per-layer overrides, so guessing one back
        // from data_layer_years risks expanding it to layers the user never touched.
        return {
            id: scenario.id,
            name: scenario.name,
            description: scenario.description,
            start_year: scenario.start_year,
            end_year: scenario.end_year,
            reference_year: undefined,
            data_layer_years: scenario.data_layer_years ?? {},
        };
    }, [scenario]);

    return useFormik({
        initialValues: values,
        validationSchema,
        validateOnBlur: true,
        onSubmit,
    });
};
