import { useMemo } from 'react';
import { useGetBudgetSettings } from '../../../../hooks/useGetBudgetSettings';
import { useGetCostBreakdownLines } from '../../../interventions/hooks/useGetCostBreakdownLines';
import { usePlanningContext } from '../../contexts/PlanningContext';
import {
    bufferMultiplierToPercent,
    DEFAULT_BUFFER_MULTIPLIER,
} from '../../libs/cost-utils';
import { CostLineValueField } from '../../libs/override-utils';
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
    previewRule?: Partial<ScenarioRule>,
): AssignmentRuleSource => ({
    id: previewRule?.id,
    color: previewRule?.color ?? '',
    name: previewRule?.name ?? '',
    intervention_overrides: previewRule?.intervention_overrides ?? [],
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
        () => (isRuleView ? [toPreviewRuleSource(previewRule)] : scenarioRules),
        [isRuleView, previewRule, scenarioRules],
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
