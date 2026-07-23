import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { FormikHelpers, useFormik } from 'formik';
import * as Yup from 'yup';
import { MESSAGES } from '../../../messages';

export const defaultInterventionBasicValues = {
    id: undefined,
    intervention_category: null,
    name: '',
    short_name: '',
    code: '',
    description: '',
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
            }),
        [formatMessage],
    );
};

export const useInterventionBasicFormState = ({
    onSubmit,
    initialValues,
}: {
    onSubmit: (values: any, formikHelpers?: FormikHelpers<any>) => void;
    initialValues?: any;
}) => {
    const validationSchema = useValidation();
    const formik = useFormik({
        initialValues: initialValues ?? defaultInterventionBasicValues,
        validationSchema,
        enableReinitialize: true,
        onSubmit,
    });

    return formik;
};
