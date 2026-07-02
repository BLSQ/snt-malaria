import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { FormikHelpers, useFormik } from 'formik';
import * as Yup from 'yup';
import { MESSAGES } from '../../../messages';

export const defaultCostUnitValues = {
    id: undefined,
    name: '',
    value: '',
    invert_value: false,
    is_proportional: true,
    description: '',
};

const useValidation = () => {
    const { formatMessage } = useSafeIntl();

    return useMemo(
        () =>
            Yup.object().shape({
                name: Yup.string()
                    .required(formatMessage(MESSAGES.required))
                    .max(100, formatMessage(MESSAGES.maxLength, { max: 100 })),
                value: Yup.number()
                    .nullable()
                    .transform((value, originalValue) =>
                        originalValue === '' ? null : value,
                    )
                    .when('is_proportional', {
                        is: true,
                        then: schema =>
                            schema
                                .typeError(
                                    formatMessage(
                                        MESSAGES.costUnitRatioInvalid,
                                    ),
                                )
                                .min(
                                    0,
                                    formatMessage(
                                        MESSAGES.negativeValueNotAllowed,
                                    ),
                                ),
                        otherwise: schema => schema.notRequired(),
                    }),
                invert_value: Yup.boolean(),
                is_proportional: Yup.boolean(),
                description: Yup.string(),
            }),
        [formatMessage],
    );
};

export const useCostUnitFormState = ({
    onSubmit,
    initialValues,
}: {
    onSubmit: (values: any, formikHelpers?: FormikHelpers<any>) => void;
    initialValues?: any;
}) => {
    const validationSchema = useValidation();
    const formik = useFormik({
        initialValues: initialValues ?? defaultCostUnitValues,
        validationSchema,
        enableReinitialize: true,
        onSubmit,
    });

    return formik;
};
