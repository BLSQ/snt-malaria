import React, { FC, useCallback, useEffect, useMemo } from 'react';
import {
    Box,
    Checkbox,
    FormControlLabel,
    Stack,
    Typography,
} from '@mui/material';
import { useSafeIntl, useTranslatedErrors } from 'bluesquare-components';
import { ColorPicker } from 'Iaso/components/forms/ColorPicker';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { useGetExtendedFormikContext } from '../../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../../contexts/PlanningContext';
import { useGetAccountSettings } from '../../../hooks/useGetAccountSettings';
import { useGetOrgUnits } from '../../../hooks/useGetOrgUnits';
import { ScenarioRuleFormValues } from '../../../hooks/useScenarioRuleFormState';
import { generateRuleName } from '../../../libs/rule-utils';
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
    const { metricTypeCategories, interventionCategories } =
        usePlanningContext();

    const { data: accountSettings } = useGetAccountSettings();
    // Fetch all intervention-level org units including geometry. The map makes
    // the same request (same query key), so when the page was loaded without a
    // region filter this is an instant cache hit instead of a costly extra call.
    const interventionTypeId =
        accountSettings?.intervention_org_unit_type_id;
    const { data: allOrgUnits, isLoading: isLoadingOrgUnits } =
        useGetOrgUnits({
            orgUnitTypeId: interventionTypeId,
            enabled: !!interventionTypeId,
        });

    const {
        values,
        errors,
        touched,
        setValues,
        setFieldTouched,
        setFieldValueAndState,
        setChildFieldValueAndState,
        addChildValue,
        removeChildValue,
    } = useGetExtendedFormikContext<ScenarioRuleFormValues>();

    // Auto-fill the rule name from selected interventions while the user has
    // not taken ownership of the field (`has_custom_name=false`). Ownership is
    // flipped by `onNameChange` / `onNameBlur` below.
    useEffect(() => {
        if (values.has_custom_name) return;
        const generated = generateRuleName(
            values.intervention_properties,
            interventionCategories,
        );
        if (values.name !== generated) {
            setFieldValueAndState('name', generated);
        }
    }, [
        values.has_custom_name,
        values.name,
        values.intervention_properties,
        interventionCategories,
        setFieldValueAndState,
    ]);

    // The user has taken ownership of the field, we set `has_custom_name` to true
    const onNameChange = useCallback(
        (_field: string | null, value: string) => {
            setFieldTouched('name', true, false);
            setValues(
                prev => ({
                    ...prev,
                    name: value,
                    has_custom_name: true,
                }),
                true,
            );
        },
        [setValues, setFieldTouched],
    );

    // If the user leaves the field empty, flip `has_custom_name` back to false, so the rule name is auto-generated again
    const onNameBlur = useCallback(() => {
        if (values.name === '' && values.has_custom_name) {
            setFieldValueAndState('has_custom_name', false);
        }
    }, [values.name, values.has_custom_name, setFieldValueAndState]);

    const getErrors = useTranslatedErrors({
        errors,
        touched,
        formatMessage,
        messages: MESSAGES,
    });

    const allOrgUnitOptions = useMemo(
        () =>
            (allOrgUnits ?? []).map(orgUnit => ({
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
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <ScenarioRuleHeading
                            label={formatMessage(MESSAGES.selectionCriteria)}
                        />
                        {values.matching_criteria.length === 0 && (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={values.is_match_all}
                                        onChange={e =>
                                            setFieldValueAndState(
                                                'is_match_all',
                                                e.target.checked,
                                            )
                                        }
                                    />
                                }
                                label={formatMessage(MESSAGES.matchAllOrgUnits)}
                            />
                        )}
                    </Box>
                    {!values.is_match_all && (
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
                    )}
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
                        loading={isLoadingOrgUnits}
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
                        loading={isLoadingOrgUnits}
                        disabled={values.is_match_all}
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
                    {/* Wrapper so we can listen for blur: InputComponent does
                     * not forward onBlur to its inner TextInput for type=text.
                     * React's onBlur is delegated, so it fires when focus
                     * leaves any descendant. */}
                    <Box onBlur={onNameBlur} mt={2} sx={{ flexGrow: 1 }}>
                        <InputComponent
                            keyValue="name"
                            type="text"
                            value={values.name}
                            onChange={onNameChange}
                            errors={getErrors('name')}
                            labelString={' '}
                            withMarginTop={false}
                        />
                    </Box>
                </Stack>
            </Box>
        </>
    );
};
