import React, { FC, useCallback } from 'react';
import { Stack } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { DropdownOptions } from 'Iaso/types/utils';
import { useGetExtendedFormikContext } from '../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../messages';
import { InterventionFormValues } from '../types/interventionForm';

type Props = {
    grantOptions: DropdownOptions<number>[];
};

const styles = {
    field: { flex: '1 1 0', minWidth: 0 },
};

export const InterventionForm: FC<Props> = ({ grantOptions }) => {
    const { formatMessage } = useSafeIntl();

    const { values, errors, touched, setFieldValueAndState } =
        useGetExtendedFormikContext<InterventionFormValues>();

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    const handleGrantChange = useCallback(
        (field: string, value?: number | null) =>
            setFieldValueAndState(field, value ?? null),
        [setFieldValueAndState],
    );

    return (
        <Stack spacing={2} direction="row">
            <InputComponent
                keyValue="impact_ref"
                type="text"
                value={values.impact_ref}
                onChange={setFieldValueAndState}
                errors={getErrors('impact_ref')}
                labelString={formatMessage(MESSAGES.impactRefLabel)}
                wrapperSx={styles.field}
            />
            <InputComponent
                keyValue="grant"
                type="select"
                multi={false}
                clearable
                options={grantOptions}
                value={values.grant}
                onChange={handleGrantChange}
                errors={getErrors('grant')}
                labelString={formatMessage(MESSAGES.interventionGrant)}
                wrapperSx={styles.field}
            />
        </Stack>
    );
};
