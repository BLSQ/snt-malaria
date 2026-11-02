import React, {
    FC,
    useCallback,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { createPortal } from 'react-dom';
import { useGetColors } from 'Iaso/hooks/useGetColors';
import { CardStyled } from '../../../../../components/CardStyled';
import { ExtendedFormikProvider } from '../../../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../../../messages';
import { usePlanningContext } from '../../../contexts/PlanningContext';
import { useCreateUpdateScenarioRule } from '../../../hooks/useCreateUpdateScenarioRule';
import {
    defaultScenarioRuleValues,
    ScenarioRuleFormValues,
    useScenarioRuleFormState,
} from '../../../hooks/useScenarioRuleFormState';
import { pickRandomPaletteColor } from '../../../libs/color-utils';
import {
    getRuleDisplayName,
    parseOrgUnitIds,
    resolveRuleOrgUnitIds,
} from '../../../libs/rule-utils';
import { ScenarioRule, ScenarioRulePreview } from '../../../types/scenarioRule';
import { RuleOverridesTab } from '../overrides/RuleOverridesTab';
import { ScenarioRuleForm } from './ScenarioRuleForm';
import { ScenarioRuleFormHeader } from './ScenarioRuleFormHeader';
import { useRuleMatchedOrgUnits } from './useRuleMatchedOrgUnits';

const TITLE_MESSAGES = {
    create: MESSAGES.createScenarioRule,
    edit: MESSAGES.editScenarioRule,
    duplicate: MESSAGES.duplicateScenarioRule,
};

type FormMode = keyof typeof TITLE_MESSAGES;

const getFormMode = (
    rule: ScenarioRule | undefined,
    isDuplicate: boolean,
): FormMode => {
    if (isDuplicate) {
        return 'duplicate';
    }
    return rule ? 'edit' : 'create';
};

type Props = {
    scenarioId: number;
    rule?: ScenarioRule;
    isDuplicate?: boolean;
    existingRules: ScenarioRule[];
    onClose: () => void;
    onPreviewChange?: (preview: ScenarioRulePreview) => void;
};

export const ScenarioRuleFormWrapper: FC<Props> = ({
    scenarioId,
    rule,
    isDuplicate = false,
    existingRules,
    onClose,
    onPreviewChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const { scenario, overridesTabContainer, interventionCategories } =
        usePlanningContext();
    const mode = getFormMode(rule, isDuplicate);
    const { data: palette } = useGetColors();

    // useState's lazy initializer runs only on mount, so the random pick is
    // computed once and survives subsequent re-renders of the form. The
    // palette is prefetched by the parent so it's already cached here.
    const [initialColor] = useState(() =>
        pickRandomPaletteColor(
            palette ?? [],
            existingRules.map(r => r.color).filter(Boolean),
            defaultScenarioRuleValues.color,
        ),
    );

    const { mutate: createUpdateScenarioRule, isLoading: isSubmittingRule } =
        useCreateUpdateScenarioRule(scenarioId);

    const sourceRuleName = rule
        ? getRuleDisplayName(rule, interventionCategories)
        : '';

    const initialValues: ScenarioRuleFormValues = useMemo(() => {
        if (!rule) {
            return {
                ...defaultScenarioRuleValues,
                scenario: scenarioId,
                color: initialColor,
            };
        }
        const ruleValues = {
            scenario: rule.scenario,
            interventions: rule.interventions,
            intervention_overrides: rule.intervention_overrides,
            matching_criteria: rule.matching_criteria,
            org_units_excluded: rule.org_units_excluded,
            org_units_included: rule.org_units_included,
        };
        return isDuplicate
            ? {
                  ...ruleValues,
                  name: formatMessage(MESSAGES.scenarioRuleCopyName, {
                      name: sourceRuleName,
                  }),
                  color: initialColor,
              }
            : {
                  ...ruleValues,
                  id: rule.id,
                  name: rule.name,
                  color: rule.color,
              };
    }, [
        rule,
        isDuplicate,
        scenarioId,
        initialColor,
        sourceRuleName,
        formatMessage,
    ]);

    const onSubmit = useCallback(
        (values: Partial<ScenarioRuleFormValues>) => {
            createUpdateScenarioRule(values, {
                onSuccess: () => {
                    onClose();
                },
            });
        },
        [createUpdateScenarioRule, onClose],
    );

    const formik = useScenarioRuleFormState({
        onSubmit,
        initialValues,
        editMode: mode === 'edit',
    });

    const {
        matching_criteria: matchingCriteria,
        org_units_excluded: excludedOrgUnits,
        org_units_included: includedOrgUnits,
        color,
        name,
        interventions,
        intervention_overrides: interventionOverrides,
    } = formik.values;

    const ruleMatches = useRuleMatchedOrgUnits({
        matchingCriteria,
        dataLayerYears: scenario?.data_layer_years,
    });
    const { isAwaitingFirstResult } = ruleMatches;

    const matchedOrgUnitIds = useMemo(
        () =>
            resolveRuleOrgUnitIds({
                hasCriteria: matchingCriteria.length > 0,
                ruleMatchedIds: ruleMatches.ruleMatchedIds ?? [],
                excludedIds: parseOrgUnitIds(excludedOrgUnits),
                includedIds: parseOrgUnitIds(includedOrgUnits),
            }),
        [
            matchingCriteria,
            ruleMatches.ruleMatchedIds,
            excludedOrgUnits,
            includedOrgUnits,
        ],
    );

    const canSubmit =
        formik.isValid &&
        interventions.length > 0 &&
        !isAwaitingFirstResult &&
        !ruleMatches.isLoading &&
        matchedOrgUnitIds.length > 0;

    const onPreviewChangeRef = useRef(onPreviewChange);
    onPreviewChangeRef.current = onPreviewChange;

    useLayoutEffect(() => {
        if (isAwaitingFirstResult) {
            return;
        }
        onPreviewChangeRef.current?.({
            rule: {
                color,
                name,
                interventions,
                intervention_overrides: interventionOverrides,
            },
            matchedOrgUnitIds,
        });
    }, [
        color,
        name,
        interventions,
        interventionOverrides,
        matchedOrgUnitIds,
        isAwaitingFirstResult,
    ]);

    const duplicateHeaderProps = isDuplicate
        ? {
              submitLabel: formatMessage(MESSAGES.createCopy),
              notice: formatMessage(MESSAGES.duplicateScenarioRuleNotice, {
                  name: sourceRuleName,
              }),
          }
        : {};

    return (
        <CardStyled
            header={
                <ScenarioRuleFormHeader
                    title={formatMessage(TITLE_MESSAGES[mode])}
                    {...duplicateHeaderProps}
                    onCancel={onClose}
                    onSubmit={formik.handleSubmit}
                    disabled={isSubmittingRule || !canSubmit}
                />
            }
            isLoading={isSubmittingRule}
            flushContent
        >
            <ExtendedFormikProvider formik={formik}>
                <ScenarioRuleForm
                    ruleMatches={ruleMatches}
                    matchedOrgUnitIds={
                        isAwaitingFirstResult ? undefined : matchedOrgUnitIds
                    }
                />
                {overridesTabContainer &&
                    createPortal(<RuleOverridesTab />, overridesTabContainer)}
            </ExtendedFormikProvider>
        </CardStyled>
    );
};
