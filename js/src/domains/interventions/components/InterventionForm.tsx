import React, { FC } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { useGetChildError } from '../../../hooks/useGetChildError';
import { useGetExtendedFormikContext } from '../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../messages';
import { InterventionDetails } from '../../planning/types/interventions';
import { InterventionCostBreakdownLineForm } from './InterventionCostBreakdownLineForm';

export const InterventionForm: FC = () => {
    const { formatMessage } = useSafeIntl();

    const {
        values,
        errors,
        touched,
        setFieldValueAndState,
        setChildFieldValueAndState,
        addChildValue,
        removeChildValue,
    } = useGetExtendedFormikContext<InterventionDetails>();

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    const getChildError = useGetChildError<InterventionDetails>({
        errors: errors?.cost_breakdown_lines,
        touched: touched?.cost_breakdown_lines,
    });

    return (
        <Stack spacing={3}>
            <Stack spacing={2} direction="row">
                <InputComponent
                    keyValue="name"
                    type="text"
                    value={values.name}
                    onChange={setFieldValueAndState}
                    errors={getErrors('name')}
                    labelString={formatMessage(MESSAGES.label)}
                    wrapperSx={{ flexGrow: 1 }}
                />
                <InputComponent
                    keyValue="impact_ref"
                    type="text"
                    value={values.impact_ref}
                    onChange={setFieldValueAndState}
                    errors={getErrors('impact_ref')}
                    labelString={formatMessage(MESSAGES.impactRefLabel)}
                    wrapperSx={{ flexGrow: 1 }}
                />
            </Stack>
            <Stack spacing={1} direction="column">
                <Typography variant="h6">
                    {formatMessage(MESSAGES.costItems)}
                </Typography>
                {values.cost_breakdown_lines &&
                    values.cost_breakdown_lines.length > 0 &&
                    values.cost_breakdown_lines.map((line, index) => (
                        <InterventionCostBreakdownLineForm
                            key={`cost-details-row-${line.id}`}
                            costBreakdownLine={line}
                            onUpdateField={(field, value) =>
                                setChildFieldValueAndState(
                                    'cost_breakdown_lines',
                                    index,
                                    field,
                                    value,
                                )
                            }
                            onRemove={() =>
                                removeChildValue('cost_breakdown_lines', index)
                            }
                            getErrors={field => getChildError(field, index)}
                        />
                    ))}
                <Button
                    variant="text"
                    sx={{ alignSelf: 'flex-start' }}
                    onClick={() => addChildValue('cost_breakdown_lines', {})}
                >
                    {formatMessage(MESSAGES.addInterventionCostBreakdownLine)}
                </Button>
            </Stack>
        </Stack>
    );
};
