import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { useGetCostBreakdownLines } from '../../../interventions/hooks/useGetCostBreakdownLines';
import { InterventionCostBreakdownLine } from '../../../interventions/types';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { getColorRange } from '../../libs/color-utils';
import {
    BudgetIntervention,
    BudgetInterventionCostLine,
} from '../../types/budget';
import { InterventionPlan } from '../../types/interventionAssignments';
import { BudgetRow, BudgetRowData } from './BudgetRow';
import { BudgetTotalRow } from './BudgetTotalRow';
import { CostLineRowData, CostLineYearlyCoverage } from './CostLineRow';

const styles = {
    container: {
        maxHeight: '100%',
        ' .MuiTableFooter-root': {
            position: 'sticky',
            insetBlockEnd: 0,
        },
    },
} satisfies SxStyles;

export const BudgetTable: FC = ({}) => {
    const [budgetRows, setBudgetRows] = useState<BudgetRowData[]>([]);
    const { formatMessage } = useSafeIntl();
    const {
        interventionPlans,
        budgets,
        scenarioYearlyCostAssignments,
        isScenarioEditable,
    } = usePlanningContext();
    const { data: costLines } = useGetCostBreakdownLines();
    const [totalCosts, setTotalCosts] = useState<{
        totalCost: number;
        yearlyTotal: Record<number, number>;
        interventionTotals: { label: string; totalCost: number }[];
    }>({
        totalCost: 0,
        yearlyTotal: {},
        interventionTotals: [],
    });

    const yearlyCoverageByCostLine = useMemo(() => {
        const coverageByCostLine: Record<
            number,
            Record<number, CostLineYearlyCoverage>
        > = {};

        scenarioYearlyCostAssignments.forEach(assignment => {
            if (!coverageByCostLine[assignment.cost_line]) {
                coverageByCostLine[assignment.cost_line] = {};
            }

            if (
                coverageByCostLine[assignment.cost_line][assignment.year] ===
                undefined
            ) {
                coverageByCostLine[assignment.cost_line][assignment.year] = {
                    id: assignment.id,
                    value: assignment.value,
                };
            }
        });

        return coverageByCostLine;
    }, [scenarioYearlyCostAssignments]);

    const { costBreakdownLineRecord, defaultCostRowDataByIntervention } =
        useMemo(() => {
            const lineRecord: Record<number, InterventionCostBreakdownLine> =
                {};
            const defaultRowsByIntervention: Record<number, CostLineRowData[]> =
                {};
            if (costLines) {
                costLines.forEach(line => {
                    lineRecord[line.id] = line;
                    if (!defaultRowsByIntervention[line.intervention]) {
                        defaultRowsByIntervention[line.intervention] = [];
                    }
                    defaultRowsByIntervention[line.intervention].push({
                        id: line.id,
                        label: line.name,
                        subLabel: '',
                        isProportional: line.is_proportional,
                        totalCost: 0,
                        coverageByYear: (yearlyCoverageByCostLine[line.id] ||
                            {}) as Record<number, CostLineYearlyCoverage>,
                        unitCost: Number(line.unit_cost),
                        unitName: line.unit_type_label,
                        conversionFactor:
                            line.conversion_factor != null
                                ? Number(line.conversion_factor)
                                : null,
                        invertedConversionFactor: line.invert_conversion_factor,
                        targetPopulation: null,
                        buffer: 1.1,
                    });
                });
            }

            return {
                costBreakdownLineRecord: lineRecord,
                defaultCostRowDataByIntervention: defaultRowsByIntervention,
            };
        }, [costLines, yearlyCoverageByCostLine]);

    const yearRange = useMemo(
        () =>
            budgets.reduce((range, budget) => {
                if (!range.includes(budget.year)) {
                    range.push(budget.year);
                }
                return range;
            }, [] as number[]),
        [budgets],
    );

    const interventionCosts = useMemo(
        () =>
            budgets.reduce(
                (acc, budget) => {
                    budget.interventions.forEach(intervention => {
                        const key: number = intervention.id;
                        if (!acc[key]) {
                            acc[key] = [];
                        }
                        acc[key].push({
                            ...intervention,
                            year: budget.year,
                        } as BudgetIntervention & { year: number });
                    });
                    return acc;
                },
                {} as Record<number, (BudgetIntervention & { year: number })[]>,
            ),
        [budgets],
    );

    const populateInterventionCost = useCallback(
        (plan: InterventionPlan) => {
            const orgUnitCount = plan.org_units.length || 0;
            const preListedCostBreakdowns = (
                defaultCostRowDataByIntervention[plan.intervention.id] || []
            ).map(costLine => ({
                ...costLine,
                totalCost: 0,
            }));

            return {
                interventionId: plan.intervention.id,
                interventionLabel: plan.intervention.short_name,
                orgUnitCount,
                yearCosts: {} as Record<number, number>,
                totalCost: 0,
                costBreakdowns: preListedCostBreakdowns,
            };
        },
        [defaultCostRowDataByIntervention],
    );

    const applyBudgetSnapshot = (
        row: CostLineRowData,
        costLine: BudgetInterventionCostLine,
    ) => {
        row.totalCost += costLine.total_cost;
        row.unitCost = costLine.unit_cost ?? row.unitCost;
        row.unitName = costLine.cost_unit_name ?? row.unitName;
        row.conversionFactor = costLine.conversion_factor;
        row.targetPopulation = costLine.target_population;
        row.invertedConversionFactor = costLine.invert_conversion_factor;
        row.buffer = costLine.buffer ?? row.buffer;
    };

    const populateCostLine = useCallback(
        (costLine: BudgetInterventionCostLine): CostLineRowData => {
            const breakdownLine = costBreakdownLineRecord[costLine.id];
            return {
                id: costLine.id,
                label: breakdownLine?.name ?? '',
                subLabel: '',
                isProportional: breakdownLine?.is_proportional ?? true,
                totalCost: costLine.total_cost,
                coverageByYear: (yearlyCoverageByCostLine[costLine.id] ||
                    {}) as Record<number, CostLineYearlyCoverage>,
                unitCost: costLine.unit_cost ?? 0,
                unitName: costLine.cost_unit_name ?? '',
                conversionFactor: costLine.conversion_factor,
                invertedConversionFactor: costLine.invert_conversion_factor,
                targetPopulation: costLine.target_population,
                buffer: costLine.buffer ?? 1.1,
            };
        },
        [costBreakdownLineRecord, yearlyCoverageByCostLine],
    );

    useEffect(() => {
        const rows = [] as BudgetRowData[];
        const costs = {
            totalCost: 0,
            yearlyTotal: {} as Record<number, number>,
            interventionTotals: [] as { label: string; totalCost: number }[],
        };
        interventionPlans.forEach(plan => {
            const yearlyInterventions =
                interventionCosts[plan.intervention.id] || [];
            const row = populateInterventionCost(plan);
            const costLineById = new Map(
                row.costBreakdowns.map(cl => [cl.id, cl]),
            );

            yearlyInterventions.forEach(intervention => {
                row.yearCosts[intervention.year] = intervention.total_cost;
                row.totalCost += intervention.total_cost;
                costs.totalCost += intervention.total_cost;
                costs.yearlyTotal[intervention.year] =
                    (costs.yearlyTotal[intervention.year] || 0) +
                    intervention.total_cost;

                intervention.cost_breakdown.forEach(costLine => {
                    const existing = costLineById.get(costLine.id);
                    if (existing) {
                        applyBudgetSnapshot(existing, costLine);
                    } else {
                        const newRow = populateCostLine(costLine);
                        row.costBreakdowns.push(newRow);
                        costLineById.set(newRow.id, newRow);
                    }
                });
            });

            costs.interventionTotals.push({
                label: row.interventionLabel,
                totalCost: row.totalCost,
            });

            rows.push(row);
        });

        setBudgetRows(rows);
        setTotalCosts(costs);
    }, [
        interventionPlans,
        interventionCosts,
        setBudgetRows,
        defaultCostRowDataByIntervention,
        populateCostLine,
        populateInterventionCost,
    ]);

    const colors = useMemo(() => {
        return getColorRange(budgetRows.length);
    }, [budgetRows]);

    return budgetRows.length > 0 ? (
        <TableContainer sx={styles.container} component={Paper}>
            <Table
                stickyHeader
                aria-label={formatMessage(MESSAGES.budgetingTableAriaLabel)}
            >
                <TableHead>
                    <TableRow>
                        <TableCell></TableCell>
                        <TableCell align="center">
                            {formatMessage(MESSAGES.budgetingDistricts)}
                        </TableCell>
                        {yearRange.map(year => (
                            <TableCell
                                key={`budget_header_${year}`}
                                align="center"
                            >
                                <Typography variant="body2" component="span">
                                    {year}
                                </Typography>
                            </TableCell>
                        ))}
                        <TableCell align="right">
                            {formatMessage(MESSAGES.budgetingTotalCost)}
                        </TableCell>
                        <TableCell align="center">
                            {formatMessage(MESSAGES.budgetingCostChart)}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {budgetRows.map((row, index) => (
                        <BudgetRow
                            key={row.interventionId}
                            yearRange={yearRange}
                            intervention={row}
                            combinedTotalCost={totalCosts.totalCost}
                            color={colors[index]}
                            isEditable={isScenarioEditable}
                        />
                    ))}
                </TableBody>
                <TableFooter>
                    <BudgetTotalRow
                        yearRange={yearRange}
                        totalCosts={totalCosts}
                        colors={colors}
                    />
                </TableFooter>
            </Table>
        </TableContainer>
    ) : (
        <Typography variant="body1" align="center">
            {formatMessage(MESSAGES.budgetingNoData)}
        </Typography>
    );
};
