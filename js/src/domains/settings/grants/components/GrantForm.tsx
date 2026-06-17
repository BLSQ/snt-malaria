import React, { FC } from 'react';
import { Stack, TextField } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { useGetExtendedFormikContext } from '../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../../messages';
import { GrantFormValues } from '../types';
import { DonorSelect } from './DonorSelect';

export const GrantForm: FC = () => {
    const { formatMessage } = useSafeIntl();

    const { values, errors, touched, setFieldValueAndState } =
        useGetExtendedFormikContext<GrantFormValues>();

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    return (
        <Stack spacing={2}>
            <Stack spacing={2} direction="row" alignItems="flex-start">
                <InputComponent
                    keyValue="name"
                    type="text"
                    value={values.name}
                    onChange={setFieldValueAndState}
                    errors={getErrors('name')}
                    required
                    labelString={formatMessage(MESSAGES.grantName)}
                    withMarginTop={false}
                    wrapperSx={{ flexGrow: 1 }}
                />
                <InputComponent
                    keyValue="short_name"
                    type="text"
                    value={values.short_name}
                    onChange={setFieldValueAndState}
                    errors={getErrors('short_name')}
                    labelString={formatMessage(MESSAGES.grantShortName)}
                    withMarginTop={false}
                    wrapperSx={{ flexGrow: 1 }}
                />
                <InputComponent
                    keyValue="amount"
                    type="number"
                    value={values.amount}
                    onChange={setFieldValueAndState}
                    errors={getErrors('amount')}
                    labelString={formatMessage(MESSAGES.grantAmount)}
                    withMarginTop={false}
                    wrapperSx={{ flexGrow: 1 }}
                />
            </Stack>
            <DonorSelect
                value={values.donor}
                onChange={donor => setFieldValueAndState('donor', donor)}
                errors={getErrors('donor')}
            />
            <TextField
                label={formatMessage(MESSAGES.grantDescription)}
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
