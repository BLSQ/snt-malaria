import React, { FC, useCallback } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';

import { ColorPicker } from 'Iaso/components/forms/ColorPicker';
import { SxStyles } from 'Iaso/types/general';
import { useGetExtendedFormikContext } from '../../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../../contexts/PlanningContext';
import { useGetAccountSettings } from '../../../hooks/useGetAccountSettings';
import { ScenarioRuleFormValues } from '../../../hooks/useScenarioRuleFormState';
import { generateRuleName } from '../../../libs/rule-utils';
import { InterventionPropertiesForm } from './InterventionPropertiesForm';
import { MatchingCriteriaForm } from './MatchingCriteriaForm';
import { OrgUnitScopeSelector } from './orgUnitScopeSelector/OrgUnitScopeSelector';
import { RuleCoverageSummary } from './RuleCoverageSummary';

const parseOrgUnitIds = (commaSeparatedIds?: string): number[] =>
    (commaSeparatedIds || '')
        .split(',')
        .filter(id => id !== '')
        .map(id => parseInt(id, 10))
        .filter(id => Number.isFinite(id));

const styles = {
    formRoot: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
    },
    // Pins the coverage widgets to the bottom of the panel, but collapses when
    // the rule content is tall enough to push them down (and the panel scrolls).
    coverage: {
        mt: 'auto',
    },
    formWrapper: {
        p: 2,
        backgroundColor: 'grey.100',
        borderRadius: 3,
    },
    ruleNameInput: {
        flexGrow: 1,
        // The placeholder is the auto-generated rule name that is actually
        // used when the field is left empty, so style it as a real value.
        '& .MuiInputBase-input::placeholder': {
            color: 'text.primary',
            opacity: 1,
        },
        '& .MuiInputBase-input:focus::placeholder': {
            opacity: 0,
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

type Props = {
    matchedOrgUnitIds?: number[];
    isLoadingPreview?: boolean;
};

export const ScenarioRuleForm: FC<Props> = ({
    matchedOrgUnitIds,
    isLoadingPreview,
}) => {
    const { formatMessage } = useSafeIntl();
    const { metricTypeCategories, interventionCategories, scenario } =
        usePlanningContext();

    const { data: accountSettings } = useGetAccountSettings();
    const interventionTypeId = accountSettings?.intervention_org_unit_type_id;

    const {
        values,
        errors,
        touched,
        setFieldValueAndState,
        addChildValue,
        removeChildValue,
        setChildFieldValueAndState,
    } = useGetExtendedFormikContext<ScenarioRuleFormValues>();

    const onChangeExcludedOrgUnits = useCallback(
        (ids: number[]) => {
            setFieldValueAndState('org_units_excluded', ids.join(','));
        },
        [setFieldValueAndState],
    );

    const onChangeHandpickedOrgUnits = useCallback(
        (ids: number[]) => {
            setFieldValueAndState('org_units_included', ids.join(','));
        },
        [setFieldValueAndState],
    );

    const onAddIntervention = useCallback(
        (interventionId: number) => {
            setFieldValueAndState('interventions', [
                ...values.interventions,
                interventionId,
            ]);
        },
        [setFieldValueAndState, values.interventions],
    );

    const onRemoveIntervention = useCallback(
        (index: number) => {
            const updated = [...values.interventions];
            updated.splice(index, 1);
            setFieldValueAndState('interventions', updated);
        },
        [setFieldValueAndState, values.interventions],
    );

    const onUpdateIntervention = useCallback(
        (index: number, interventionId: number) => {
            const updated = [...values.interventions];
            updated[index] = interventionId;
            setFieldValueAndState('interventions', updated);
        },
        [setFieldValueAndState, values.interventions],
    );

    return (
        <Box sx={styles.formRoot}>
            <Box sx={styles.formWrapper}>
                <Box mb={3}>
                    <ScenarioRuleHeading
                        label={formatMessage(MESSAGES.interventionProperties)}
                    />
                    <InterventionPropertiesForm
                        interventions={values.interventions}
                        interventionCategories={interventionCategories}
                        onAdd={onAddIntervention}
                        onRemove={onRemoveIntervention}
                        onUpdateField={onUpdateIntervention}
                        errors={errors.interventions}
                        touched={touched.interventions}
                    />
                </Box>
                <Box mb={2}>
                    <ScenarioRuleHeading
                        label={formatMessage(MESSAGES.selectionCriteria)}
                    />
                    <MatchingCriteriaForm
                        metricTypeCategories={metricTypeCategories}
                        dataLayerYears={scenario?.data_layer_years}
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
                    <OrgUnitScopeSelector
                        interventionTypeId={interventionTypeId}
                        matchingCriteria={values.matching_criteria}
                        dataLayerYears={scenario?.data_layer_years}
                        excludedIds={parseOrgUnitIds(values.org_units_excluded)}
                        handpickedIds={parseOrgUnitIds(
                            values.org_units_included,
                        )}
                        onChangeExcluded={onChangeExcludedOrgUnits}
                        onChangeHandpicked={onChangeHandpickedOrgUnits}
                    />
                </Box>
            </Box>
            <Box mt={3}>
                <Typography variant="body2" fontWeight="medium" mb={1}>
                    {formatMessage(MESSAGES.ruleNameAndColor)}
                </Typography>
                <Stack direction="row" spacing={2}>
                    <TextField
                        fullWidth
                        size="small"
                        value={values.name}
                        onChange={e =>
                            setFieldValueAndState('name', e.target.value)
                        }
                        placeholder={generateRuleName(
                            values.interventions,
                            interventionCategories,
                        )}
                        sx={styles.ruleNameInput}
                    />
                    <Box pt={1}>
                        <ColorPicker
                            displayLabel={false}
                            currentColor={values.color}
                            onChangeColor={color =>
                                setFieldValueAndState('color', color)
                            }
                        />
                    </Box>
                </Stack>
            </Box>
            <Box sx={styles.coverage}>
                <RuleCoverageSummary
                    matchedOrgUnitIds={matchedOrgUnitIds}
                    isLoadingPreview={isLoadingPreview}
                />
            </Box>
        </Box>
    );
};
