import { useMemo } from 'react';
import { useGetBudgetSettings } from '../../../../hooks/useGetBudgetSettings';
import { useGetCostBreakdownLines } from '../../../interventions/hooks/useGetCostBreakdownLines';
import { InterventionCategory } from '../../../interventions/types';
import { usePlanningContext } from '../../contexts/PlanningContext';
import {
    bufferMultiplierToPercent,
    DEFAULT_BUFFER_MULTIPLIER,
} from '../../libs/cost-utils';
import { CostLineValueField } from '../../libs/override-utils';
import { getRuleDisplayName } from '../../libs/rule-utils';
import { ScenarioRule } from '../../types/scenarioRule';
import {
    buildPreviewAssignments,
    buildSavedAssignments,
} from '../interventionPlanMap/buildEffectiveAssignments';
import {
    AssignmentRuleSource,
    AssignmentTable,
    AssignmentTableMode,
    buildAssignmentTable,
} from './buildAssignmentTable';

type Args = {
    matchedOrgUnitIds: number[];
    previewRule?: Partial<ScenarioRule>;
    scenarioRules: ScenarioRule[];
    mode: AssignmentTableMode;
    field: CostLineValueField;
    year: number;
};

const toPreviewRuleSource = (
    previewRule: Partial<ScenarioRule> | undefined,
    interventionCategories: InterventionCategory[],
): AssignmentRuleSource => ({
    id: previewRule?.id,
    color: previewRule?.color ?? '',
    name: getRuleDisplayName(
        {
            name: previewRule?.name ?? '',
            interventions: previewRule?.interventions ?? [],
        },
        interventionCategories,
    ),
    intervention_overrides: previewRule?.intervention_overrides ?? [],
});

const toScenarioRuleSource = (
    rule: ScenarioRule,
    interventionCategories: InterventionCategory[],
): AssignmentRuleSource => ({
    ...rule,
    name: getRuleDisplayName(rule, interventionCategories),
});

export const useAssignmentTableData = ({
    matchedOrgUnitIds,
    previewRule,
    scenarioRules,
    mode,
    field,
    year,
}: Args): { table: AssignmentTable; legendRules: AssignmentRuleSource[] } => {
    const {
        isEditing: isRuleView,
        orgUnits,
        interventionCategories,
        interventionAssignments,
        scenarioYears,
    } = usePlanningContext();
    const { data: costLines = [] } = useGetCostBreakdownLines();
    const { data: budgetSettings } = useGetBudgetSettings();
    const defaultBufferPercent = bufferMultiplierToPercent(
        Number(budgetSettings?.buffer ?? DEFAULT_BUFFER_MULTIPLIER),
    );

    const assignments = useMemo(
        () =>
            isRuleView
                ? buildPreviewAssignments({
                      matchedOrgUnitIds,
                      previewRule,
                      interventionCategories,
                  })
                : buildSavedAssignments(interventionAssignments),
        [
            isRuleView,
            matchedOrgUnitIds,
            previewRule,
            interventionCategories,
            interventionAssignments,
        ],
    );

    const rules = useMemo<AssignmentRuleSource[]>(
        () =>
            isRuleView
                ? [toPreviewRuleSource(previewRule, interventionCategories)]
                : scenarioRules.map(rule =>
                      toScenarioRuleSource(rule, interventionCategories),
                  ),
        [isRuleView, previewRule, scenarioRules, interventionCategories],
    );

    const table = useMemo(
        () =>
            buildAssignmentTable({
                assignments,
                orgUnits,
                rules,
                interventionCategories,
                costLines,
                scenarioYears,
                year,
                mode,
                field,
                defaultBufferPercent,
            }),
        [
            assignments,
            orgUnits,
            rules,
            interventionCategories,
            costLines,
            scenarioYears,
            year,
            mode,
            field,
            defaultBufferPercent,
        ],
    );

    const legendRules = useMemo(() => {
        const usedRuleIds = new Set(assignments.map(a => a.ruleId));
        return rules.filter(rule => usedRuleIds.has(rule.id));
    }, [assignments, rules]);

    return { table, legendRules };
};
