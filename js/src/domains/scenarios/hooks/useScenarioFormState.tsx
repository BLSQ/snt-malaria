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
 * Splits a flat `data_layer_years` map (as stored on the backend) back into a
 * `reference_year` + override pairs, for the edit form. There is no persisted
 * "this was the default" flag, so the most frequent year in the map is treated
 * as the reference year, and only entries that differ from it are shown as
 * per-layer overrides - this keeps the "customize per data layer" section from
 * re-listing every layer once a reference year has been saved once.
 */
export const splitDataLayerYears = (
    dataLayerYears: Record<string, number>,
): Pick<ScenarioFormValues, 'reference_year' | 'data_layer_years'> => {
    const entries = Object.entries(dataLayerYears ?? {});
    if (entries.length === 0) {
        return { reference_year: undefined, data_layer_years: {} };
    }

    const counts = new Map<number, number>();
    entries.forEach(([, year]) => {
        counts.set(year, (counts.get(year) ?? 0) + 1);
    });

    let referenceYear: number | undefined;
    let maxCount = 0;
    counts.forEach((count, year) => {
        if (count > maxCount) {
            maxCount = count;
            referenceYear = year;
        }
    });

    const overrides = Object.fromEntries(
        entries.filter(([, year]) => year !== referenceYear),
    );
    return { reference_year: referenceYear, data_layer_years: overrides };
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
        const { reference_year, data_layer_years } = splitDataLayerYears(
            scenario.data_layer_years,
        );
        return {
            id: scenario.id,
            name: scenario.name,
            description: scenario.description,
            start_year: scenario.start_year,
            end_year: scenario.end_year,
            reference_year,
            data_layer_years,
        };
    }, [scenario]);

    return useFormik({
        initialValues: values,
        validationSchema,
        validateOnBlur: true,
        onSubmit,
    });
};
