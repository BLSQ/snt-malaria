import React, { FC } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useSafeIntl, useTranslatedErrors } from 'bluesquare-components';
import { ColorPicker } from 'Iaso/components/forms/ColorPicker';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { useGetExtendedFormikContext } from '../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../../messages';
import { InterventionCategory } from '../../../planning/types/interventions';
import { MetricTypeCategory } from '../../../planning/types/metrics';
import { ScenarioRuleFormValues } from '../../hooks/useScenarioRuleFormState';
import { InterventionPropertiesForm } from './InterventionPropertiesForm';
import { MatchingCriteriaForm } from './MatchingCriteriaForm';

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
                    <ScenarioRuleHeading
                        chipLabel="1"
                        label={formatMessage(MESSAGES.interventionProperties)}
                    />
                    <InterventionPropertiesForm
                        interventionProperties={values.intervention_properties}
                        interventionCategories={interventionCategories}
                        onAdd={addChildValue}
                        onRemove={(list_field_key: string, index: number) =>
                            removeChildValue(list_field_key, index)
                        }
                        errors={errors.intervention_properties}
                        touched={touched.intervention_properties}
                        onUpdateField={setChildFieldValueAndState}
                    />
                </Box>
                <Box mb={2}>
                    <ScenarioRuleHeading
                        chipLabel="2"
                        label={formatMessage(MESSAGES.selectionCriteria)}
                    />
                    <MatchingCriteriaForm
                        metricTypeCategories={metricTypeCategories}
                        matchingCriteria={values.matching_criteria}
                        onAdd={addChildValue}
                        onRemove={(list_field_key: string, index: number) =>
                            removeChildValue(list_field_key, index)
                        }
                        errors={errors.matching_criteria}
                        touched={touched.matching_criteria}
                        onUpdateField={setChildFieldValueAndState}
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
