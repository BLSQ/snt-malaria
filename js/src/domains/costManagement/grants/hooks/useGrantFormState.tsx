import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { FormikHelpers, useFormik } from 'formik';
import * as Yup from 'yup';
import { MESSAGES } from '../../../messages';

export const defaultGrantValues = {
    id: undefined,
    name: '',
    short_name: '',
    description: '',
    amount: null,
    donor: null,
};

const useValidation = () => {
    const { formatMessage } = useSafeIntl();

    return useMemo(
        () =>
            Yup.object().shape({
                name: Yup.string()
                    .required(formatMessage(MESSAGES.required))
                    .max(255, formatMessage(MESSAGES.maxLength, { max: 255 })),
                short_name: Yup.string().max(
                    100,
                    formatMessage(MESSAGES.maxLength, { max: 100 }),
                ),
                description: Yup.string(),
                amount: Yup.number().nullable(),
                // Either an existing donor id (number) or a free-typed name
                // (string) for a donor created implicitly on save.
                donor: Yup.mixed()
                    .nullable()
                    .required(formatMessage(MESSAGES.required)),
            }),
        [formatMessage],
    );
};

export const useGrantFormState = ({
    onSubmit,
    initialValues,
}: {
    onSubmit: (values: any, formikHelpers?: FormikHelpers<any>) => void;
    initialValues?: any;
}) => {
    const validationSchema = useValidation();
    const formik = useFormik({
        initialValues: initialValues ?? defaultGrantValues,
        validationSchema,
        enableReinitialize: true,
        onSubmit,
    });

    return formik;
};
