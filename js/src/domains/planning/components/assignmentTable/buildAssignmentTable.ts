import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import {
    Intervention,
    InterventionCategory,
    InterventionCostBreakdownLine,
} from '../../../interventions/types';
import {
    CostLineValueField,
    countInterventionOverrides,
    findCostLineOverride,
    findInterventionOverride,
    getDeployedYears,
    resolveCostLineValue,
} from '../../libs/override-utils';
import { ScenarioRule } from '../../types/scenarioRule';
import { NormalizedAssignment } from '../interventionPlanMap/buildEffectiveAssignments';

export type AssignmentTableMode = 'interventions' | 'costItems';
export type AssignmentTableFilter = 'all' | 'deployed' | 'overridden';

export type AssignmentRuleSource = Pick<
    ScenarioRule,
    'color' | 'name' | 'intervention_overrides'
> & { id?: number };

export type AssignmentColumn = {
    key: string;
    costLine?: InterventionCostBreakdownLine;
};

export type AssignmentColumnGroup = {
    intervention: Intervention;
    categoryName: string;
    columns: AssignmentColumn[];
    startIndex: number;
};

export type AssignmentFlatColumn = {
    column: AssignmentColumn;
    label: string;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
};

export type AssignmentTableCell = {
    rule?: AssignmentRuleSource;
    isDeployed: boolean;
    isOverridden: boolean;
    overrideCount: number;
    value: number | null;
    isRuleValue: boolean;
};

export type AssignmentRow = {
    orgUnitId: number;
    name: string;
    regionName: string;
    isAssigned: boolean;
    isDeployed: boolean;
    isOverridden: boolean;
    cells: AssignmentTableCell[];
};

export type AssignmentTable = {
    groups: AssignmentColumnGroup[];
    rows: AssignmentRow[];
    assignedCount: number;
};

type BuildArgs = {
    assignments: NormalizedAssignment[];
    orgUnits: OrgUnit[];
    rules: AssignmentRuleSource[];
    interventionCategories: InterventionCategory[];
    costLines: InterventionCostBreakdownLine[];
    scenarioYears: number[];
    year: number;
    mode: AssignmentTableMode;
    field: CostLineValueField;
    defaultBufferPercent: number;
};

const emptyCell: AssignmentTableCell = {
    isDeployed: false,
    isOverridden: false,
    overrideCount: 0,
    value: null,
    isRuleValue: false,
};

const buildGroups = (
    assignments: NormalizedAssignment[],
    interventionCategories: InterventionCategory[],
    costLines: InterventionCostBreakdownLine[],
    mode: AssignmentTableMode,
): AssignmentColumnGroup[] => {
    const assignedIds = new Set(
        assignments.map(assignment => assignment.interventionId),
    );
    let startIndex = 0;
    return interventionCategories.flatMap(category =>
        category.interventions
            .filter(intervention => assignedIds.has(intervention.id))
            .map(intervention => {
                const lines = costLines.filter(
                    line => line.intervention === intervention.id,
                );
                const columns =
                    mode === 'costItems' && lines.length > 0
                        ? lines.map(line => ({
                              key: `${intervention.id}-${line.id}`,
                              costLine: line,
                          }))
                        : [{ key: `${intervention.id}` }];
                const group = {
                    intervention,
                    categoryName: category.name,
                    columns,
                    startIndex,
                };
                startIndex += columns.length;
                return group;
            }),
    );
};

export const flattenColumns = (
    groups: AssignmentColumnGroup[],
): AssignmentFlatColumn[] =>
    groups.flatMap(group =>
        group.columns.map((column, index) => ({
            column,
            label: column.costLine
                ? `${group.intervention.name}, ${column.costLine.name}`
                : group.intervention.name,
            isFirstInGroup: index === 0,
            isLastInGroup: index === group.columns.length - 1,
        })),
    );

export const buildAssignmentTable = ({
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
}: BuildArgs): AssignmentTable => {
    const groups = buildGroups(
        assignments,
        interventionCategories,
        costLines,
        mode,
    );

    const ruleByAssignment = new Map<string, AssignmentRuleSource>();
    assignments.forEach(assignment => {
        if (assignment.interventionId === undefined) return;
        const rule = rules.find(r => r.id === assignment.ruleId) ?? {
            color: assignment.ruleColor,
            name: '',
            intervention_overrides: [],
        };
        ruleByAssignment.set(
            `${assignment.orgUnitId}-${assignment.interventionId}`,
            rule,
        );
    });
    const assignedOrgUnitIds = new Set(
        assignments.map(assignment => assignment.orgUnitId),
    );

    const buildCell = (
        orgUnitId: number,
        intervention: Intervention,
        column: AssignmentColumn,
    ): AssignmentTableCell => {
        const rule = ruleByAssignment.get(`${orgUnitId}-${intervention.id}`);
        if (!rule) return emptyCell;
        const override = findInterventionOverride(
            rule.intervention_overrides,
            intervention.id,
        );
        const isDeployed = getDeployedYears(override, scenarioYears).includes(
            year,
        );
        if (mode === 'interventions' || !column.costLine) {
            const overrideCount = isDeployed
                ? countInterventionOverrides(override)
                : 0;
            return {
                rule,
                isDeployed,
                isOverridden: overrideCount > 0,
                overrideCount,
                value: null,
                isRuleValue: false,
            };
        }
        if (!isDeployed) {
            return { ...emptyCell, rule };
        }
        const { value, isRuleValue } = resolveCostLineValue(
            column.costLine,
            findCostLineOverride(override, column.costLine.id),
            field,
            year,
            defaultBufferPercent,
        );
        return {
            rule,
            isDeployed,
            isOverridden: isRuleValue,
            overrideCount: 0,
            value,
            isRuleValue,
        };
    };

    const rows = [...orgUnits]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(orgUnit => {
            const cells = groups.flatMap(group =>
                group.columns.map(column =>
                    buildCell(orgUnit.id, group.intervention, column),
                ),
            );
            return {
                orgUnitId: orgUnit.id,
                name: orgUnit.name,
                regionName: orgUnit.parent_name ?? '',
                isAssigned: assignedOrgUnitIds.has(orgUnit.id),
                isDeployed: cells.some(cell => cell.isDeployed),
                isOverridden: cells.some(cell => cell.isOverridden),
                cells,
            };
        });

    return {
        groups,
        rows,
        assignedCount: rows.filter(row => row.isAssigned).length,
    };
};

export const filterAssignmentRows = (
    rows: AssignmentRow[],
    filter: AssignmentTableFilter,
    query: string,
): AssignmentRow[] => {
    const search = query.trim().toLowerCase();
    return rows.filter(
        row =>
            (filter !== 'deployed' || row.isDeployed) &&
            (filter !== 'overridden' || row.isOverridden) &&
            (!search ||
                row.name.toLowerCase().includes(search) ||
                row.regionName.toLowerCase().includes(search)),
    );
};
