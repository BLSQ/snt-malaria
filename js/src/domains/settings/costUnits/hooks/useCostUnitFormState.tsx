import { useMemo } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { FormikHelpers, useFormik } from 'formik';
import * as Yup from 'yup';
import { MESSAGES } from '../../../messages';

export const defaultCostUnitValues = {
    id: undefined,
    name: '',
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
