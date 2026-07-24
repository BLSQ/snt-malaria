import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { FormikHelpers, useFormik } from 'formik';
import * as Yup from 'yup';
import { MESSAGES } from '../../../messages';
import { InterventionCategoryPayload } from '../types';

export const defaultInterventionCategoryValues: InterventionCategoryPayload = {
    id: undefined,
    name: '',
    short_name: '',
    description: '',
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
            }),
        [formatMessage],
    );
};

export const useInterventionCategoryFormState = ({
    onSubmit,
    initialValues,
}: {
    onSubmit: (
        values: InterventionCategoryPayload,
        formikHelpers?: FormikHelpers<InterventionCategoryPayload>,
    ) => void;
    initialValues?: InterventionCategoryPayload;
}) => {
    const validationSchema = useValidation();
    const formik = useFormik({
        initialValues: initialValues ?? defaultInterventionCategoryValues,
        validationSchema,
        enableReinitialize: true,
        onSubmit,
    });

    return formik;
};
