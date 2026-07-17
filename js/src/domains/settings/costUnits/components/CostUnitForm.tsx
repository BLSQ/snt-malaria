import React, { FC } from 'react';
import { Stack, TextField } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { useGetExtendedFormikContext } from '../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../../messages';
import { CostUnitTypePayload } from '../types';

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
