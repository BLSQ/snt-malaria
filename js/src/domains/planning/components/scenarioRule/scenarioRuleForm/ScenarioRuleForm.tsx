import React, { FC, useCallback } from 'react';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { Box, Button, Stack, TextField } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';

import { ColorPicker } from 'Iaso/components/forms/ColorPicker';
import { SxStyles } from 'Iaso/types/general';
import { useGetExtendedFormikContext } from '../../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../../contexts/PlanningContext';
import { useGetAccountSettings } from '../../../hooks/useGetAccountSettings';
import { ScenarioRuleFormValues } from '../../../hooks/useScenarioRuleFormState';
import { generateRuleName, parseOrgUnitIds } from '../../../libs/rule-utils';
import { InterventionPropertiesForm } from './InterventionPropertiesForm';
import { MatchingCriteriaForm } from './MatchingCriteriaForm';
import { OrgUnitScopeSelector } from './orgUnitScopeSelector/OrgUnitScopeSelector';
import { RuleCoverageSummary } from './RuleCoverageSummary';
import { RuleStepSection, RuleStepSubSectionHeader } from './RuleStepSection';
import { RuleMatchedOrgUnits } from './useRuleMatchedOrgUnits';

const styles = {
    formRoot: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
    },
    scrollableSteps: {
        flex: '1 1 auto',
        minHeight: 0,
        overflowY: 'auto',
        p: 2,
    },
    resetMapLayerButton: {
        flex: '0 0 auto',
        whiteSpace: 'nowrap',
        mt: -0.5,
    },
    coverage: {
        flex: '0 0 auto',
        px: 2,
        pt: 1.5,
        pb: 2,
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

type Props = {
    ruleMatches: RuleMatchedOrgUnits;
    matchedOrgUnitIds?: number[];
};

export const ScenarioRuleForm: FC<Props> = ({
    ruleMatches,
    matchedOrgUnitIds,
}) => {
    const { formatMessage } = useSafeIntl();
    const {
        metricTypeCategories,
        interventionCategories,
        mapMetricTypeId,
        setMapMetricTypeId,
    } = usePlanningContext();

    const handleResetMapLayer = useCallback(
        () => setMapMetricTypeId(undefined),
        [setMapMetricTypeId],
    );

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
        setFieldTouched,
        setValues,
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
        (interventionId: number) => {
            setFieldTouched('interventions', true, false);
            setValues({
                ...values,
                interventions: values.interventions.filter(
                    id => id !== interventionId,
                ),
                intervention_overrides: values.intervention_overrides.filter(
                    override => override.intervention !== interventionId,
                ),
            });
        },
        [setFieldTouched, setValues, values],
    );

    return (
        <Box sx={styles.formRoot}>
            <Stack spacing={3} sx={styles.scrollableSteps}>
                <RuleStepSection
                    step={1}
                    title={formatMessage(MESSAGES.ruleStepRegion)}
                    description={formatMessage(
                        MESSAGES.ruleStepRegionDescription,
                    )}
                >
                    <RuleStepSubSectionHeader
                        title={formatMessage(MESSAGES.selectionCriteria)}
                        description={formatMessage(
                            MESSAGES.selectionCriteriaDescription,
                        )}
                        action={
                            mapMetricTypeId !== undefined && (
                                <Button
                                    variant="text"
                                    size="small"
                                    startIcon={<VisibilityOffOutlinedIcon />}
                                    onClick={handleResetMapLayer}
                                    sx={styles.resetMapLayerButton}
                                >
                                    {formatMessage(MESSAGES.resetMapLayer)}
                                </Button>
                            )
                        }
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
                    <RuleStepSubSectionHeader
                        title={formatMessage(MESSAGES.manualSelection)}
                    />
                    <OrgUnitScopeSelector
                        interventionTypeId={interventionTypeId}
                        matchingCriteria={values.matching_criteria}
                        ruleMatches={ruleMatches}
                        excludedIds={parseOrgUnitIds(values.org_units_excluded)}
                        handpickedIds={parseOrgUnitIds(
                            values.org_units_included,
                        )}
                        onChangeExcluded={onChangeExcludedOrgUnits}
                        onChangeHandpicked={onChangeHandpickedOrgUnits}
                    />
                </RuleStepSection>
                <RuleStepSection
                    step={2}
                    title={formatMessage(MESSAGES.interventionProperties)}
                    description={formatMessage(
                        MESSAGES.ruleStepInterventionsDescription,
                    )}
                >
                    <InterventionPropertiesForm
                        interventions={values.interventions}
                        interventionCategories={interventionCategories}
                        onAdd={onAddIntervention}
                        onRemove={onRemoveIntervention}
                    />
                </RuleStepSection>
                <RuleStepSection
                    step={3}
                    title={formatMessage(MESSAGES.ruleNameAndColor)}
                    description={formatMessage(
                        MESSAGES.ruleStepNameAndColorDescription,
                    )}
                >
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
                </RuleStepSection>
            </Stack>
            <Box sx={styles.coverage}>
                <RuleCoverageSummary
                    matchedOrgUnitIds={matchedOrgUnitIds}
                    isLoadingPreview={ruleMatches.isLoading}
                />
            </Box>
        </Box>
    );
};
