import React, { FC, useEffect, useMemo, useState } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { useGetCostBreakdownLines } from '../../../interventions/hooks/useGetCostBreakdownLines';
import { InterventionCostBreakdownLine } from '../../../interventions/types';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { getColorRange } from '../../libs/color-utils';
import { BudgetIntervention } from '../../types/budget';
import { BudgetRow, BudgetRowData } from './BudgetRow';
import { BudgetTotalRow } from './BudgetTotalRow';
import { CostLineRowData, CostLineYearlyCoverage } from './CostLineRow';

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
                        totalCost: 0,
                        coverageByYear: (yearlyCoverageByCostLine[line.id] ||
                            {}) as Record<number, CostLineYearlyCoverage>,
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

    useEffect(() => {
        const rows = [] as BudgetRowData[];
        const costs = {
            totalCost: 0,
            yearlyTotal: {} as Record<number, number>,
            interventionTotals: [] as { label: string; totalCost: number }[],
        };
        interventionPlans.forEach(plan => {
            const orgUnitCount = plan.org_units.length || 0;
            const yearlyInterventions =
                interventionCosts[plan.intervention.id] || [];

            const preListedCostBreakdowns = (
                defaultCostRowDataByIntervention[plan.intervention.id] || []
            ).map(costLine => ({
                ...costLine,
                totalCost: 0,
            }));

            const row = {
                interventionId: plan.intervention.id,
                interventionLabel: plan.intervention.short_name,
                orgUnitCount,
                yearCosts: {} as Record<number, number>,
                totalCost: 0,
                costBreakdowns: preListedCostBreakdowns,
            };

            yearlyInterventions.forEach(intervention => {
                row.yearCosts[intervention.year] = intervention.total_cost;
                row.totalCost += intervention.total_cost;
                costs.totalCost += intervention.total_cost;
                costs.yearlyTotal[intervention.year] =
                    (costs.yearlyTotal[intervention.year] || 0) +
                    intervention.total_cost;

                intervention.cost_breakdown.forEach(costLine => {
                    const existingCostLine = row.costBreakdowns.find(
                        (line: CostLineRowData) => line.id === costLine.id,
                    );
                    if (existingCostLine) {
                        existingCostLine.totalCost += costLine.total_cost;
                    } else {
                        const breakdownLine =
                            costBreakdownLineRecord[costLine.id];
                        row.costBreakdowns.push({
                            id: costLine.id,
                            label: breakdownLine ? breakdownLine.name : '',
                            subLabel: '',
                            totalCost: costLine.total_cost,
                            coverageByYear: (yearlyCoverageByCostLine[
                                costLine.id
                            ] || {}) as Record<number, CostLineYearlyCoverage>,
                        });
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
        costBreakdownLineRecord,
        yearlyCoverageByCostLine,
    ]);

    const colors = useMemo(() => {
        return getColorRange(budgetRows.length);
    }, [budgetRows]);

    return budgetRows.length > 0 ? (
        <TableContainer
            sx={{ mx: -2, width: 'calc(100% + 32px)' }}
            component={Paper}
        >
            <Table aria-label={formatMessage(MESSAGES.budgetingTableAriaLabel)}>
                <TableHead>
                    <TableRow>
                        <TableCell>
                            {formatMessage(MESSAGES.budgetingLineItem)}
                        </TableCell>
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
                        <TableCell align="center">
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
                    <BudgetTotalRow
                        yearRange={yearRange}
                        totalCosts={totalCosts}
                        colors={colors}
                    />
                </TableBody>
            </Table>
        </TableContainer>
    ) : (
        <Typography variant="body1" align="center">
            {formatMessage(MESSAGES.budgetingNoData)}
        </Typography>
    );
};
