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
    parseOrgUnitIds,
    resolveRuleOrgUnitIds,
} from '../../../libs/rule-utils';
import { ScenarioRule, ScenarioRulePreview } from '../../../types/scenarioRule';
import { RuleOverridesTab } from '../overrides/RuleOverridesTab';
import { ScenarioRuleForm } from './ScenarioRuleForm';
import { ScenarioRuleFormHeader } from './ScenarioRuleFormHeader';
import { useRuleMatchedOrgUnits } from './useRuleMatchedOrgUnits';

type Props = {
    scenarioId: number;
    rule?: ScenarioRule;
    existingRules: ScenarioRule[];
    onClose: () => void;
    onPreviewChange?: (preview: ScenarioRulePreview) => void;
};

export const ScenarioRuleFormWrapper: FC<Props> = ({
    scenarioId,
    rule,
    existingRules,
    onClose,
    onPreviewChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const { scenario, overridesTabContainer } = usePlanningContext();
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

    const title = useMemo(() => {
        if (rule) {
            return formatMessage(MESSAGES.editScenarioRule);
        }
        return formatMessage(MESSAGES.createScenarioRule);
    }, [formatMessage, rule]);

    const initialValues: ScenarioRuleFormValues | undefined = useMemo(
        () =>
            rule
                ? {
                      id: rule.id,
                      scenario: rule.scenario,
                      name: rule.name,
                      color: rule.color,
                      interventions: rule.interventions,
                      intervention_overrides: rule.intervention_overrides,
                      matching_criteria: rule.matching_criteria,
                      org_units_excluded: rule.org_units_excluded,
                      org_units_included: rule.org_units_included,
                  }
                : {
                      ...defaultScenarioRuleValues,
                      scenario: scenarioId,
                      color: initialColor,
                  },
        [rule, scenarioId, initialColor],
    );

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
        editMode: Boolean(rule),
    });

    const {
        matching_criteria: matchingCriteria,
        org_units_excluded: excludedOrgUnits,
        org_units_included: includedOrgUnits,
        color,
        interventions,
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

    const onPreviewChangeRef = useRef(onPreviewChange);
    onPreviewChangeRef.current = onPreviewChange;

    useLayoutEffect(() => {
        if (isAwaitingFirstResult) {
            return;
        }
        onPreviewChangeRef.current?.({
            rule: { color, interventions },
            matchedOrgUnitIds,
        });
    }, [color, interventions, matchedOrgUnitIds, isAwaitingFirstResult]);

    return (
        <CardStyled
            header={
                <ScenarioRuleFormHeader
                    title={title}
                    onCancel={onClose}
                    onSubmit={formik.handleSubmit}
                    disabled={isSubmittingRule || !formik.isValid}
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
