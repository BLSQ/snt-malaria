import React, { useCallback, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { MESSAGES } from '../../messages';

interface ScenarioFormValues {
    id?: number;
    name: string;
    description: string;
    start_year?: number;
    end_year?: number;
}

const initialValues: ScenarioFormValues = {
    id: undefined,
    name: '',
    description: '',
    start_year: undefined,
    end_year: undefined,
};

const ScenarioForm: React.FC<{
    onSubmit: (values: ScenarioFormValues) => void;
    formValues?: ScenarioFormValues;
    onSubmitFormRef: (callback: () => void) => void;
}> = ({ onSubmit, formValues, onSubmitFormRef }) => {
    const { formatMessage } = useSafeIntl();

    const validationSchema = useMemo(
        () =>
            Yup.object({
                name: Yup.string()
                    .max(255)
                    .required(formatMessage(MESSAGES.required)),
                description: Yup.string(),
                start_year: Yup.number()
                    .required()
                    .min(2024, formatMessage(MESSAGES.minYear, { year: 2024 }))
                    .max(2035, formatMessage(MESSAGES.maxYear, { year: 2035 })),
                end_year: Yup.number()
                    .required()
                    .min(2024, formatMessage(MESSAGES.minYear, { year: 2024 }))
                    .max(2035, formatMessage(MESSAGES.maxYear, { year: 2035 }))
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
            }),
        [formatMessage],
    );

    const {
        values,
        setFieldValue,
        handleSubmit,
        errors,
        touched,
        setFieldTouched,
    } = useFormik({
        initialValues: formValues || initialValues,
        validationSchema,
        validateOnBlur: true,
        onSubmit: onSubmit,
    });

    const setFieldValueAndState = useCallback(
        (field: string, value: any) => {
            setFieldTouched(field, true);
            setFieldValue(field, value);
        },
        [setFieldTouched, setFieldValue],
    );

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    useEffect(() => {
        onSubmitFormRef(handleSubmit);
    }, [handleSubmit, onSubmitFormRef]);

    return (
        <Box>
            <InputComponent
                keyValue="name"
                onChange={setFieldValueAndState}
                value={values.name}
                type="text"
                label={MESSAGES.name}
                required
                errors={getErrors('name')}
            />
            <InputComponent
                keyValue="description"
                onChange={setFieldValueAndState}
                value={values.description}
                type="text"
                label={MESSAGES.description}
                errors={getErrors('description')}
            />
            <InputComponent
                type="number"
                keyValue="start_year"
                value={values.start_year}
                onChange={setFieldValueAndState}
                label={MESSAGES.startYear}
                required
                numberInputOptions={{
                    thousandSeparator: ' ',
                    decimalSeparator: ',',
                }}
                errors={getErrors('start_year')}
            />
            <InputComponent
                type="number"
                keyValue="end_year"
                value={values.end_year}
                onChange={setFieldValueAndState}
                label={MESSAGES.endYear}
                required
                numberInputOptions={{
                    thousandSeparator: ' ',
                    decimalSeparator: ',',
                }}
                errors={getErrors('end_year')}
            />
        </Box>
    );
};

export default ScenarioForm;
