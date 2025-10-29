import React, { FC, useCallback, useMemo, useState } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { PaperContainer } from '../../../../components/styledComponents';
import { MESSAGES } from '../../../messages';
import {
    Budget,
    BudgetIntervention,
    BudgetInterventionCostLine,
} from '../../types/budget';
import { CostBreakdownChart } from './CostBreakdownChart';
import { ProportionChart } from './ProportionChart';

type Props = {
    budgets: Budget[];
};

export const Budgeting: FC<Props> = ({ budgets }) => {
    const { formatMessage } = useSafeIntl();
    const [selectedYear, setSelectedYear] = useState<number | null>(0);
    const defaultBudgetOption = useMemo(
        () => ({
            label: formatMessage(MESSAGES.entirePeriod),
            value: 0,
        }),
        [formatMessage],
    );

    const mergeCostBreakdown = useCallback(
        (
            sourceCostBreakdown: BudgetInterventionCostLine[],
            costBreakdownToAdd: BudgetInterventionCostLine[],
        ) => {
            const mergedCosts = {};
            sourceCostBreakdown.forEach(
                c => (mergedCosts[c.category] = c.cost),
            );
            costBreakdownToAdd.forEach(c => {
                const cost = mergedCosts[c.category]
                    ? mergedCosts[c.category] + c.cost
                    : c.cost;
                mergedCosts[c.category] = cost;
            });

            return Object.entries(mergedCosts).map(([category, cost]) => ({
                category,
                cost,
            })) as BudgetInterventionCostLine[];
        },
        [],
    );

    const mergeInterventionCosts = useCallback(
        (
            sourceInterventions: BudgetIntervention[],
            interventionsToAdd: BudgetIntervention[],
        ) => {
            const mergedCosts = {};
            sourceInterventions?.forEach(i => (mergedCosts[i.name] = i));
            interventionsToAdd.forEach(i => {
                const existing = mergedCosts[i.name];
                const newVal = { ...i };
                if (existing) {
                    newVal.total_cost += existing.total_cost;
                    newVal.cost_breakdown = mergeCostBreakdown(
                        existing.cost_breakdown,
                        newVal.cost_breakdown,
                    );
                }

                mergedCosts[i.name] = newVal;
            });
            return Object.values(mergedCosts) as BudgetIntervention[];
        },
        [mergeCostBreakdown],
    );
    const yearOptions = useMemo(
        () => [
            defaultBudgetOption,
            ...budgets?.map(b => ({
                label: b.year.toString(),
                value: b.year,
            })),
        ],
        [budgets, defaultBudgetOption],
    );
    const interventionCosts = useMemo(
        () =>
            selectedYear || yearOptions.length <= 2
                ? budgets.find(b => b.year === selectedYear)?.interventions
                : budgets.reduce(
                      (interventions, b) =>
                          mergeInterventionCosts(
                              interventions,
                              b.interventions,
                          ),
                      [],
                  ),
        [budgets, yearOptions, selectedYear, mergeInterventionCosts],
    );

    return (
        <>
            {yearOptions && yearOptions.length > 2 && (
                <Grid item xs={12} md={12}>
                    <Box
                        sx={{
                            py: 1,
                            px: 4,
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: 'white',
                            borderRadius: 4,
                        }}
                    >
                        <Typography sx={{ marginRight: 2 }}>
                            {formatMessage(MESSAGES.selectYear)}
                        </Typography>

                        <InputComponent
                            type="select"
                            multi={false}
                            value={selectedYear}
                            options={yearOptions}
                            labelString="" // This is required to prevent warning in console..
                            onChange={(_, value) => setSelectedYear(value)}
                            keyValue="year_options"
                            withMarginTop={false}
                            wrapperSx={{ minWidth: '225px' }}
                        />
                    </Box>
                </Grid>
            )}
            {interventionCosts && (
                <>
                    <Grid item xs={12} md={7}>
                        <PaperContainer>
                            <CostBreakdownChart
                                interventionBudgets={interventionCosts}
                            />
                        </PaperContainer>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <PaperContainer>
                            <ProportionChart
                                interventionBudgets={interventionCosts}
                            />
                        </PaperContainer>
                    </Grid>
                </>
            )}
        </>
    );
};
