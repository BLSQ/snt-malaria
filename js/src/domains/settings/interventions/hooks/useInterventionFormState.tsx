import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { FormikHelpers, useFormik } from 'formik';
import * as Yup from 'yup';
import { MESSAGES } from '../../../messages';
import { InterventionFormValues } from '../types/interventionForm';

export const defaultInterventionFormValues: InterventionFormValues = {
    id: undefined,
    intervention_category: null,
    name: '',
    short_name: '',
    code: '',
    description: '',
    impact_ref: '',
    grant: null,
    cost_breakdown_lines: [],
};

const useValidation = () => {
    const { formatMessage } = useSafeIntl();

    return useMemo(
        () =>
            Yup.object().shape({
                intervention_category: Yup.number()
                    .nullable()
                    .required(formatMessage(MESSAGES.required)),
                name: Yup.string()
                    .required(formatMessage(MESSAGES.required))
                    .max(255, formatMessage(MESSAGES.maxLength, { max: 255 })),
                short_name: Yup.string().max(
                    100,
                    formatMessage(MESSAGES.maxLength, { max: 100 }),
                ),
                code: Yup.string()
                    .required(formatMessage(MESSAGES.required))
                    .max(50, formatMessage(MESSAGES.maxLength, { max: 50 })),
                description: Yup.string(),
                impact_ref: Yup.string(),
                grant: Yup.number().nullable(),
                cost_breakdown_lines: Yup.array().of(
                    Yup.object().shape({
                        name: Yup.string().required(
                            formatMessage(MESSAGES.required),
                        ),
                        unit_cost: Yup.number()
                            .required(formatMessage(MESSAGES.required))
                            .min(
                                0,
                                formatMessage(MESSAGES.negativeValueNotAllowed),
                            ),
                        category: Yup.string().required(
                            formatMessage(MESSAGES.required),
                        ),
                        unit_type: Yup.string().required(
                            formatMessage(MESSAGES.required),
                        ),
                        is_proportional: Yup.boolean(),
                        invert_conversion_factor: Yup.boolean(),
                        population_layer: Yup.number()
                            .nullable()
                            .when('is_proportional', {
                                is: true,
                                then: schema =>
                                    schema.required(
                                        formatMessage(MESSAGES.required),
                                    ),
                                otherwise: schema => schema.notRequired(),
                            }),
                        conversion_factor: Yup.number()
                            .nullable()
                            .min(
                                0,
                                formatMessage(MESSAGES.negativeValueNotAllowed),
                            )
                            .when('is_proportional', {
                                is: true,
                                then: schema =>
                                    schema.required(
                                        formatMessage(MESSAGES.required),
                                    ),
                                otherwise: schema => schema.notRequired(),
                            }),
                    }),
                ),
            }),
        [formatMessage],
    );
};

export const useInterventionFormState = ({
    onSubmit,
    initialValues,
}: {
    onSubmit: (
        values: InterventionFormValues,
        formikHelpers?: FormikHelpers<InterventionFormValues>,
    ) => void;
    initialValues?: InterventionFormValues;
}) => {
    const validationSchema = useValidation();
    const formik = useFormik({
        initialValues: initialValues ?? defaultInterventionFormValues,
        validationSchema,
        enableReinitialize: true,
        onSubmit,
    });

    return formik;
};
