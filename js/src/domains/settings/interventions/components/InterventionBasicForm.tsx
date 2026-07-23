import React, { FC, useMemo } from 'react';
import { Stack, TextField } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { SxStyles } from 'Iaso/types/general';
import { useGetExtendedFormikContext } from '../../../../hooks/useGetExtendedFormikContext';
import { useGetInterventionCategories } from '../../../interventions/hooks/useGetInterventionCategories';
import { MESSAGES } from '../../../messages';
import { InterventionBasicFormValues } from '../types/interventionBasicForm';

const styles: SxStyles = {
    row: { flexGrow: 1 },
    field: { flex: '1 1 0', minWidth: 0 },
};

export const InterventionBasicForm: FC = () => {
    const { formatMessage } = useSafeIntl();

    const { data: interventionCategories = [] } = useGetInterventionCategories();

    const categoryOptions = useMemo(
        () =>
            interventionCategories.map(category => ({
                label: category.name,
                value: category.id,
            })),
        [interventionCategories],
    );

    const { values, errors, touched, setFieldValueAndState } =
        useGetExtendedFormikContext<InterventionBasicFormValues>();

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    return (
        <Stack spacing={2}>
            <Stack spacing={2} direction="row" sx={styles.row}>
                <InputComponent
                    keyValue="intervention_category"
                    type="select"
                    multi={false}
                    clearable={false}
                    options={categoryOptions}
                    value={values.intervention_category}
                    onChange={setFieldValueAndState}
                    errors={getErrors('intervention_category')}
                    required
                    labelString={formatMessage(
                        MESSAGES.interventionCategoryField,
                    )}
                    wrapperSx={styles.field}
                />
                <InputComponent
                    keyValue="name"
                    type="text"
                    value={values.name}
                    onChange={setFieldValueAndState}
                    errors={getErrors('name')}
                    required
                    labelString={formatMessage(MESSAGES.interventionName)}
                    wrapperSx={styles.field}
                />
                <InputComponent
                    keyValue="short_name"
                    type="text"
                    value={values.short_name}
                    onChange={setFieldValueAndState}
                    errors={getErrors('short_name')}
                    labelString={formatMessage(
                        MESSAGES.interventionShortName,
                    )}
                    wrapperSx={styles.field}
                />
                <InputComponent
                    keyValue="code"
                    type="text"
                    value={values.code}
                    onChange={setFieldValueAndState}
                    errors={getErrors('code')}
                    required
                    labelString={formatMessage(MESSAGES.interventionCode)}
                    wrapperSx={styles.field}
                />
            </Stack>
            <TextField
                label={formatMessage(MESSAGES.interventionDescription)}
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
