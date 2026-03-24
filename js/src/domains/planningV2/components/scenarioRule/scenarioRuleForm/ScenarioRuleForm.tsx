import React, { FC, useCallback, useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useSafeIntl, useTranslatedErrors } from 'bluesquare-components';
import { ColorPicker } from 'Iaso/components/forms/ColorPicker';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { useGetExtendedFormikContext } from '../../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../../contexts/PlanningContext';
import { ScenarioRuleFormValues } from '../../../hooks/useScenarioRuleFormState';
import { InterventionPropertiesForm } from './InterventionPropertiesForm';
import { MatchingCriteriaForm } from './MatchingCriteriaForm';

const styles = {
    formWrapper: {
        p: 2,
        backgroundColor: 'grey.100',
        borderRadius: 3,
    },
    inputLabel: {
        ' .MuiInputLabel-shrink': {
            backgroundColor: 'grey.100',
        },
    },
} satisfies SxStyles;

const ScenarioRuleHeading: FC<{ label: string }> = ({ label }) => {
    return (
        <Typography variant="subtitle1" gutterBottom>
            {label}
        </Typography>
    );
};

export const ScenarioRuleForm: FC = () => {
    const { formatMessage } = useSafeIntl();
    const {
        metricTypeCategories,
        interventionCategories,
        orgUnits: allOrgUnits,
    } = usePlanningContext();

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

    const allOrgUnitOptions = useMemo(
        () =>
            allOrgUnits.map(orgUnit => ({
                value: orgUnit.id,
                label: orgUnit.name,
            })),
        [allOrgUnits],
    );

    const excludeOrgUnitsFromList = useCallback(
        (exclusionList: string) =>
            allOrgUnitOptions.filter(
                option =>
                    !exclusionList
                        ?.split(',')
                        .includes(option.value.toString()),
            ),
        [allOrgUnitOptions],
    );

    const inclusionOrgUnitOptions = useMemo(
        () => excludeOrgUnitsFromList(values.org_units_excluded || ''),
        [excludeOrgUnitsFromList, values.org_units_excluded],
    );
    const exclusionOrgUnitOptions = useMemo(
        () => excludeOrgUnitsFromList(values.org_units_included || ''),
        [excludeOrgUnitsFromList, values.org_units_included],
    );

    return (
        <>
            <Box sx={styles.formWrapper}>
                <Box mb={3}>
                    <ScenarioRuleHeading
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
                <Box>
                    <ScenarioRuleHeading
                        label={formatMessage(MESSAGES.ruleExceptions)}
                    />
                    <InputComponent
                        keyValue="org_units_excluded"
                        type="select"
                        value={values.org_units_excluded || []}
                        multi={true}
                        options={exclusionOrgUnitOptions}
                        onChange={setFieldValueAndState}
                        errors={getErrors('org_units_excluded')}
                        label={MESSAGES.excludedOrgUnits}
                        wrapperSx={styles.inputLabel}
                    />

                    <InputComponent
                        keyValue="org_units_included"
                        type="select"
                        value={values.org_units_included || []}
                        multi={true}
                        options={inclusionOrgUnitOptions}
                        onChange={setFieldValueAndState}
                        errors={getErrors('org_units_included')}
                        label={MESSAGES.includedOrgUnits}
                        wrapperSx={styles.inputLabel}
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
                        wrapperSx={{ flexGrow: 1 }}
                        labelString={' '}
                    />
                </Stack>
            </Box>
        </>
    );
};
