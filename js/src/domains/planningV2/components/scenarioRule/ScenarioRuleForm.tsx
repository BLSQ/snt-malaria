import React, { FC } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useSafeIntl, useTranslatedErrors } from 'bluesquare-components';
import { ColorPicker } from 'Iaso/components/forms/ColorPicker';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useGetExtendedFormikContext } from '../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../../messages';
import { InterventionCategory } from '../../../planning/types/interventions';
import { MetricTypeCategory } from '../../../planning/types/metrics';
import {
    defaultInterventionRule,
    defaultMetricRule,
    ScenarioRuleFormValues,
} from '../../hooks/useScenarioRuleFormState';
import { InterventionCriterionForm } from './InterventionCriterionForm';
import { MetricCriterionForm } from './MetricCriterionForm';

const ScenarioRuleHeading: FC<{ chipLabel: string; label: string }> = ({
    chipLabel,
    label,
}) => {
    return (
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <Chip label={chipLabel} />
            <Typography variant="body2" fontWeight="medium">
                {label}
            </Typography>
        </Stack>
    );
};

type ScenarioRuleFormProps = {
    metricTypeCategories: MetricTypeCategory[];
    interventionCategories: InterventionCategory[];
};

export const ScenarioRuleForm: FC<ScenarioRuleFormProps> = ({
    metricTypeCategories,
    interventionCategories,
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
    } = useGetExtendedFormikContext<ScenarioRuleFormValues>();

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    return (
        <>
            <Box
                sx={{
                    p: 2,
                    backgroundColor: 'grey.100',
                    borderRadius: 3,
                }}
            >
                <Box mb={3}>
                    <ScenarioRuleHeading chipLabel="1" label="Interventions" />
                    <InterventionCriterionForm
                        interventionCriterion={values.interventionRules}
                        interventionCategories={interventionCategories}
                        onAdd={interventionCategory =>
                            addChildValue(
                                'interventionRules',
                                defaultInterventionRule,
                                {
                                    interventionCategory,
                                },
                            )
                        }
                        onRemove={(index: number) =>
                            removeChildValue('interventionRules', index)
                        }
                        errors={errors.interventionRules}
                        touched={touched.interventionRules}
                        onUpdateField={(index, field, value) =>
                            setChildFieldValueAndState(
                                'interventionRules',
                                index,
                                field,
                                value,
                            )
                        }
                    />
                </Box>
                <Box mb={2}>
                    <ScenarioRuleHeading
                        chipLabel="2"
                        label="Selection rules"
                    />
                    <MetricCriterionForm
                        metricTypeCategories={metricTypeCategories}
                        metricTypeCriterion={values.metricTypeRules}
                        onAdd={metricType =>
                            addChildValue(
                                'metricTypeRules',
                                defaultMetricRule,
                                {
                                    metricType,
                                },
                            )
                        }
                        onRemove={(index: number) =>
                            removeChildValue('metricTypeRules', index)
                        }
                        errors={errors.metricTypeRules}
                        touched={touched.metricTypeRules}
                        onUpdateField={(index, field, value) =>
                            setChildFieldValueAndState(
                                'metricTypeRules',
                                index,
                                field,
                                value,
                            )
                        }
                    />
                </Box>
            </Box>
            <Box mt={3}>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                    {formatMessage(MESSAGES.ruleName)}
                </Typography>
                <Stack direction="row" spacing={2}>
                    <Box pt={1}>
                        <ColorPicker
                            displayLabel={false}
                            currentColor={values.color}
                            onChangeColor={color =>
                                setFieldValueAndState('color', color)
                            }
                        />
                    </Box>
                    <InputComponent
                        keyValue="name"
                        type="text"
                        value={values.name}
                        onChange={setFieldValueAndState}
                        errors={getErrors('name')}
                        withMarginTop={false}
                        wrapperSx={{ flexGrow: 1 }}
                    />
                </Stack>
            </Box>
        </>
    );
};
