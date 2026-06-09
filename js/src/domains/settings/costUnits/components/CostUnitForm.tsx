import React, { FC, useMemo } from 'react';
import {
    Box,
    FormControlLabel,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { useGetExtendedFormikContext } from '../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../../messages';
import { CostUnitTypePayload } from '../types';

const RadioOption: FC<{ label: string; help: string }> = ({ label, help }) => (
    <Stack spacing={0}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="caption" color="textSecondary">
            {help}
        </Typography>
    </Stack>
);

export const CostUnitForm: FC = () => {
    const { formatMessage } = useSafeIntl();

    const { values, errors, touched, setFieldValueAndState } =
        useGetExtendedFormikContext<CostUnitTypePayload>();

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    const valueLabel = useMemo(() => {
        const raw =
            values.value === '' || values.value === null
                ? NaN
                : Number(values.value);
        if (Number.isNaN(raw)) {
            return 'n';
        }
        return String(parseFloat(raw.toFixed(2)));
    }, [values.value]);

    return (
        <Stack spacing={2}>
            <InputComponent
                keyValue="name"
                type="text"
                value={values.name}
                onChange={setFieldValueAndState}
                errors={getErrors('name')}
                required
                labelString={formatMessage(MESSAGES.costUnitLongName)}
                withMarginTop={false}
            />
            <Stack spacing={0.5}>
                <InputComponent
                    keyValue="value"
                    type="number"
                    value={values.value ?? ''}
                    onChange={setFieldValueAndState}
                    errors={getErrors('value')}
                    labelString={formatMessage(
                        MESSAGES.costUnitConversionFactor,
                    )}
                    withMarginTop={false}
                    numberInputOptions={{ decimalScale: 2 }}
                />
                <Typography variant="caption" color="textSecondary">
                    {formatMessage(MESSAGES.costUnitConversionFactorHelp)}
                </Typography>
            </Stack>
            <Box sx={{ pb: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                    {formatMessage(MESSAGES.costUnitRatioDirection)}
                </Typography>
                <RadioGroup
                    value={values.invert_value ? 'inverse' : 'direct'}
                    onChange={(_, value) =>
                        setFieldValueAndState(
                            'invert_value',
                            value === 'inverse',
                        )
                    }
                    sx={{ gap: 1 }}
                >
                    <FormControlLabel
                        value="direct"
                        control={<Radio size="small" />}
                        label={
                            <RadioOption
                                label={formatMessage(
                                    MESSAGES.costUnitRatioDirect,
                                    { value: valueLabel },
                                )}
                                help={formatMessage(
                                    MESSAGES.costUnitRatioDirectHelp,
                                )}
                            />
                        }
                        sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                    <FormControlLabel
                        value="inverse"
                        control={<Radio size="small" />}
                        label={
                            <RadioOption
                                label={formatMessage(
                                    MESSAGES.costUnitRatioInverse,
                                    { value: valueLabel },
                                )}
                                help={formatMessage(
                                    MESSAGES.costUnitRatioInverseHelp,
                                )}
                            />
                        }
                        sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                </RadioGroup>
            </Box>
            <TextField
                label={formatMessage(MESSAGES.costUnitDescription)}
                value={values.description ?? ''}
                onChange={event =>
                    setFieldValueAndState('description', event.target.value)
                }
                multiline
                minRows={2}
                fullWidth
                error={Boolean(getErrors('description')?.length)}
                helperText={getErrors('description')?.[0]}
            />
        </Stack>
    );
};
