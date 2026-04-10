import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { FormikHelpers, useFormik } from 'formik';
import * as Yup from 'yup';
import { MESSAGES } from '../../messages';

const defaultInterventionValues = {
    id: undefined,
    name: '',
    impact_ref: '',
    target_population: [],
    cost_breakdown_lines: [],
};

const useValidation = () => {
    const { formatMessage } = useSafeIntl();

    return useMemo(
        () =>
            Yup.object().shape({
                name: Yup.string()
                    .required(formatMessage(MESSAGES.required))
                    .max(255, formatMessage(MESSAGES.maxLength, { max: 255 })),
                impact_ref: Yup.string(),
                target_population: Yup.array().of(Yup.string()),
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
        values: Partial<any>,
        formikHelpers?: FormikHelpers<any>,
    ) => void;
    initialValues?: any;
    editMode?: boolean;
}) => {
    const validationSchema = useValidation();
    const formik = useFormik({
        initialValues: initialValues ?? defaultInterventionValues,
        validationSchema,
        onSubmit,
    });

    return { ...formik };
};
