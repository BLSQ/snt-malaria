import React, { FC, useMemo } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { useGetChildError } from '../../../hooks/useGetChildError';
import { useGetExtendedFormikContext } from '../../../hooks/useGetExtendedFormikContext';
import {
    InterventionCostBreakdownLine,
    InterventionDetails,
} from '../../interventions/types';
import { MESSAGES } from '../../messages';
import { useInterventionContext } from '../contexts/InterventionContext';
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

    const { costUnitTypeOptions } = useInterventionContext();

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

    const defaultBreakdownLine: Partial<InterventionCostBreakdownLine> =
        useMemo(
            () => ({
                unit_type: costUnitTypeOptions[0]?.value || '',
            }),
            [costUnitTypeOptions],
        );

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
            <Stack spacing={2} direction="column">
                <Typography variant="subtitle1" fontWeight="medium">
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
                    onClick={() =>
                        addChildValue('cost_breakdown_lines', {
                            ...defaultBreakdownLine,
                        })
                    }
                >
                    {formatMessage(MESSAGES.addInterventionCostBreakdownLine)}
                </Button>
            </Stack>
        </Stack>
    );
};
