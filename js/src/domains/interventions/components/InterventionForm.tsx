import React, { FC, useMemo } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { DropdownOptions, useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useTranslatedErrors } from 'Iaso/libs/validation';
import { useGetChildError } from '../../../hooks/useGetChildError';
import { useGetExtendedFormikContext } from '../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../messages';
import {
    InterventionCostBreakdownLine,
    InterventionDetails,
} from '../../planning/types/interventions';
import { MetricType } from '../../planning/types/metrics';
import { InterventionCostBreakdownLineForm } from './InterventionCostBreakdownLineForm';
import { TargetPopulationForm } from './TargetPopulationForm';

type Props = {
    interventionCostCategories: DropdownOptions<string>[];
    interventionCostUnitTypes: DropdownOptions<string>[];
    metricTypes: MetricType[];
    currency?: string;
};

export const InterventionForm: FC<Props> = ({
    interventionCostCategories,
    interventionCostUnitTypes,
    metricTypes,
    currency = 'USD',
}) => {
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

    const defaultBreakdownLine: Partial<InterventionCostBreakdownLine> =
        useMemo(
            () => ({
                unit_type: interventionCostUnitTypes[0]?.value || '',
            }),
            [interventionCostUnitTypes],
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
            <Stack spacing={2} direction="column" justifyContent="flex-start">
                <Typography variant="subtitle1" fontWeight="medium">
                    {formatMessage(MESSAGES.costSettings)}
                </Typography>
                <TargetPopulationForm
                    targetPopulation={values.target_population}
                    onUpdateField={setFieldValueAndState}
                    getErrors={getErrors}
                    metricTypes={metricTypes}
                    interventionCode={values.code}
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
                            currency={currency}
                            onUpdateField={(field, value) =>
                                setChildFieldValueAndState(
                                    'cost_breakdown_lines',
                                    index,
                                    field,
                                    value,
                                )
                            }
                            interventionCostCategories={
                                interventionCostCategories
                            }
                            interventionCostUnitTypes={
                                interventionCostUnitTypes
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
