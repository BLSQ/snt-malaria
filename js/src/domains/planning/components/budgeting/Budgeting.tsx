import React, { FC, useCallback, useMemo, useState } from 'react';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { Box, Grid, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { IconBoxed } from '../../../../components/IconBoxed';
import { PaperContainer } from '../../../../components/styledComponents';
import { MESSAGES } from '../../../messages';
import { formatBigNumber } from '../../libs/cost-utils';
import {
    Budget,
    BudgetIntervention,
    BudgetInterventionCostLine,
    BudgetOrgUnit,
} from '../../types/budget';
import { CostBreakdownChart } from './CostBreakdownChart';
import { OrgUnitCostMap } from './OrgUnitCostMap';
import { ProportionChart } from './ProportionChart';

type Props = {
    budgets: Budget[];
    orgUnits: OrgUnit[];
};

export const Budgeting: FC<Props> = ({ budgets, orgUnits }) => {
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
            sourceCostBreakdown: BudgetInterventionCostLine[] = [],
            costBreakdownToAdd: BudgetInterventionCostLine[] = [],
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
            sourceInterventions?.forEach(
                i => (mergedCosts[`${i.type} - ${i.code}`] = i),
            );
            interventionsToAdd.forEach(i => {
                const existing = mergedCosts[`${i.type} - ${i.code}`];
                const newVal = { ...i };
                if (existing) {
                    newVal.total_cost += existing.total_cost;
                    newVal.cost_breakdown = mergeCostBreakdown(
                        existing.cost_breakdown,
                        newVal.cost_breakdown,
                    );
                }

                mergedCosts[`${i.type} - ${i.code}`] = newVal;
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

    const mergeOrgUnitCosts = useCallback(
        (target: BudgetOrgUnit[], source: BudgetOrgUnit[]) => {
            const mergedCosts = {};
            target.forEach(i => (mergedCosts[i.org_unit_id] = i));
            source?.forEach(org_unit_cost => {
                const org_unit_id = org_unit_cost.org_unit_id;
                const existing = mergedCosts[org_unit_id];
                if (existing) {
                    existing.total_cost += org_unit_cost.total_cost;
                    existing.interventions = mergeInterventionCosts(
                        existing.interventions ?? [],
                        org_unit_cost.interventions ?? [],
                    );
                } else {
                    mergedCosts[org_unit_id] = { ...org_unit_cost };
                }
            });
            return Object.values(mergedCosts) as BudgetOrgUnit[];
        },
        [mergeInterventionCosts],
    );

    const orgUnitCosts = useMemo(
        () =>
            selectedYear || yearOptions.length <= 2
                ? budgets.find(b => b.year === selectedYear)?.org_units_costs
                : budgets.reduce(
                      (org_units_costs, b) =>
                          mergeOrgUnitCosts(org_units_costs, b.org_units_costs),
                      [] as BudgetOrgUnit[],
                  ),
        [mergeOrgUnitCosts, budgets, selectedYear, yearOptions],
    );

    const totalCost = useMemo(
        () =>
            interventionCosts?.reduce(
                (sum, interventionCost) => sum + interventionCost.total_cost,
                0,
            ) ?? 0,
        [interventionCosts],
    );

    return (
        <>
            {yearOptions && yearOptions.length > 2 && (
                <Grid item xs={12} md={12}>
                    <Box
                        sx={{
                            py: 1,
                            px: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'white',
                            borderRadius: 4,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconBoxed Icon={AttachMoneyIcon} />
                            <Typography sx={{ mx: 2 }}>
                                {formatMessage(MESSAGES.budget)}
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
                                wrapperSx={{ minWidth: '150px' }}
                                clearable={false}
                            />
                        </Box>
                        <Typography>
                            {formatMessage(MESSAGES.total)} :{' '}
                            {formatBigNumber(totalCost)}
                        </Typography>
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
                    <Grid item xs={12} md={12} sx={{ height: '493px' }}>
                        <PaperContainer sx={{ height: '100%' }}>
                            <OrgUnitCostMap
                                orgUnitCosts={orgUnitCosts}
                                orgUnits={orgUnits}
                            />
                        </PaperContainer>
                    </Grid>
                </>
            )}
        </>
    );
};
