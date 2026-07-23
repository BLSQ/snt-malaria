import React, { FC } from 'react';
import { Stack, TextField } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { useGetExtendedFormikContext } from '../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../../messages';
import { InterventionCategoryFormValues } from '../types';

export const InterventionCategoryForm: FC = () => {
    const { formatMessage } = useSafeIntl();

    const { values, errors, touched, setFieldValueAndState } =
        useGetExtendedFormikContext<InterventionCategoryFormValues>();

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
                    label={MESSAGES.interventionCategoryName}
                    withMarginTop={false}
                    wrapperSx={{ flexGrow: 1 }}
                />
                <InputComponent
                    keyValue="short_name"
                    type="text"
                    value={values.short_name}
                    onChange={setFieldValueAndState}
                    errors={getErrors('short_name')}
                    label={MESSAGES.interventionCategoryShortName}
                    withMarginTop={false}
                    wrapperSx={{ flexGrow: 1 }}
                />
            </Stack>
            <TextField
                label={formatMessage(MESSAGES.interventionCategoryDescription)}
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
