import React, { useCallback } from 'react';
import { Box } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useFormikContext } from 'formik';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { MESSAGES } from '../../messages';
import { ScenarioFormValues } from '../hooks/useScenarioFormState';

const ScenarioForm: React.FC = () => {
    const { formatMessage } = useSafeIntl();

    const { values, setFieldValue, errors, touched, setFieldTouched } =
        useFormikContext<ScenarioFormValues>();

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
