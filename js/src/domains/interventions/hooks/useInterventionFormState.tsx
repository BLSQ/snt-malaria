import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { FormikHelpers, useFormik } from 'formik';
import * as Yup from 'yup';
import { MESSAGES } from '../../messages';
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
