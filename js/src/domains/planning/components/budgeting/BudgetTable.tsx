import React, { FC, useEffect, useMemo, useState } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import { useGetCostBreakdownLines } from '../../../interventions/hooks/useGetCostBreakdownLines';
import { InterventionCostBreakdownLine } from '../../../interventions/types';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { getColorRange } from '../../libs/color-utils';
import { BudgetIntervention } from '../../types/budget';
import { BudgetRow, BudgetRowData, CostLineRowData } from './BudgetRow';
import { BudgetTotalRow } from './BudgetTotalRow';

export const BudgetTable: FC = ({}) => {
    const [budgetRows, setBudgetRows] = useState<BudgetRowData[]>([]);
    const { interventionPlans, budgets } = usePlanningContext();
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

    const costBreakdownLineRecord = useMemo(() => {
        if (!costLines) return {};
        return costLines.reduce(
            (acc, line) => {
                acc[line.id] = line;
                return acc;
            },
            {} as Record<number, InterventionCostBreakdownLine>,
        );
    }, [costLines]);

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
        const totalCosts = {
            totalCost: 0,
            yearlyTotal: {} as Record<number, number>,
            interventionTotals: [] as { label: string; totalCost: number }[],
        };
        interventionPlans.forEach(plan => {
            const orgUnitCount = plan.org_units.length || 0;
            const yearlyInterventions =
                interventionCosts[plan.intervention.id] || [];

            const row = {
                interventionId: plan.intervention.id,
                interventionLabel: plan.intervention.short_name,
                orgUnitCount,
                yearCosts: {} as Record<number, number>,
                totalCost: 0,
                costBreakdowns: [] as CostLineRowData[],
            };

            yearlyInterventions.forEach(intervention => {
                row.yearCosts[intervention.year] = intervention.total_cost;
                row.totalCost += intervention.total_cost;
                totalCosts.totalCost += intervention.total_cost;
                totalCosts.yearlyTotal[intervention.year] =
                    (totalCosts.yearlyTotal[intervention.year] || 0) +
                    intervention.total_cost;

                intervention.cost_breakdown.forEach(costLine => {
                    const existingCostLine = row.costBreakdowns.find(
                        (line: CostLineRowData) => line.id === costLine.id,
                    );
                    if (existingCostLine) {
                        existingCostLine.totalCost += costLine.cost;
                    } else {
                        const breakdownLine =
                            costBreakdownLineRecord[costLine.id];
                        row.costBreakdowns.push({
                            id: costLine.id,
                            label: breakdownLine ? breakdownLine.name : '',
                            subLabel: '',
                            totalCost: costLine.cost,
                        });
                    }
                });
            });

            totalCosts.interventionTotals.push({
                label: row.interventionLabel,
                totalCost: row.totalCost,
            });

            rows.push(row);
        });

        setBudgetRows(rows);
        setTotalCosts(totalCosts);
    }, [
        interventionPlans,
        interventionCosts,
        setBudgetRows,
        costBreakdownLineRecord,
    ]);

    const colors = useMemo(() => {
        return getColorRange(budgetRows.length);
    }, [budgetRows]);

    return (
        <TableContainer
            sx={{ mx: -2, width: 'calc(100% + 32px)' }}
            component={Paper}
        >
            <Table aria-label="collapsible table">
                <TableHead>
                    <TableRow>
                        <TableCell>Line item</TableCell>
                        <TableCell align="right">Districts</TableCell>
                        {yearRange.map(year => (
                            <TableCell
                                key={`budget_header_${year}`}
                                align="center"
                            >
                                {year}
                            </TableCell>
                        ))}
                        <TableCell align="right">Total cost ($)</TableCell>
                        <TableCell align="right">Cost chart</TableCell>
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
    );
};
