import React, { useCallback, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useFormikContext } from 'formik';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { YearRangeSlider } from '../../../components/YearRangeSlider';
import { MESSAGES } from '../../messages';
import {
    SCENARIO_YEAR_RANGE,
    ScenarioFormValues,
} from '../hooks/useScenarioFormState';

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

    const onYearRangeChange = useCallback(
        (yearRange: [number, number]) => {
            setFieldTouched('start_year', true);
            setFieldTouched('end_year', true);
            setFieldValue('start_year', yearRange[0]);
            setFieldValue('end_year', yearRange[1]);
            // Keep reference_year within the new range
            const clamped = Math.min(
                Math.max(values.reference_year, yearRange[0]),
                yearRange[1],
            );
            if (clamped !== values.reference_year) {
                setFieldValue('reference_year', clamped);
            }
        },
        [setFieldTouched, setFieldValue, values.reference_year],
    );

    const referenceYearOptions = useMemo(() => {
        const options = [];
        for (let y = values.start_year; y <= values.end_year; y++) {
            options.push({ label: String(y), value: y });
        }
        return options;
    }, [values.start_year, values.end_year]);

    const yearRangeValue: [number, number] = [
        values.start_year ?? SCENARIO_YEAR_RANGE.min,
        values.end_year ?? SCENARIO_YEAR_RANGE.max,
    ];

    const yearErrors = [...getErrors('start_year'), ...getErrors('end_year')];

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
            <Box mt={2}>
                <Typography variant="caption" color="text.secondary">
                    {formatMessage(MESSAGES.yearsLabel)}
                </Typography>
                <YearRangeSlider
                    yearRange={[
                        SCENARIO_YEAR_RANGE.min,
                        SCENARIO_YEAR_RANGE.max,
                    ]}
                    value={yearRangeValue}
                    onChange={onYearRangeChange}
                />
                {yearErrors.map(error => (
                    <Typography
                        key={`${error}`}
                        variant="caption"
                        color="error"
                        display="block"
                    >
                        {error}
                    </Typography>
                ))}
            </Box>
            <InputComponent
                type="select"
                keyValue="reference_year"
                onChange={setFieldValueAndState}
                value={values.reference_year}
                label={MESSAGES.referenceYear}
                options={referenceYearOptions}
                helperText={formatMessage(MESSAGES.referenceYearHelp)}
                errors={getErrors('reference_year')}
                withMarginTop={false}
            />
        </Box>
    );
};

export default ScenarioForm;
