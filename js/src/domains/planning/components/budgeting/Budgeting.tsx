import React, { FC, useMemo, useState } from 'react';
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

/** Group items by key, merging duplicates by summing via `merge`. */
function mergeByKey<T>(
    items: T[],
    getKey: (item: T) => string,
    merge: (existing: T, incoming: T) => T,
): T[] {
    const map = new Map<string, T>();
    for (const item of items) {
        const key = getKey(item);
        const existing = map.get(key);
        map.set(key, existing ? merge(existing, item) : { ...item });
    }
    return Array.from(map.values());
}

function mergeCostLines(lines: BudgetInterventionCostLine[]) {
    return mergeByKey(
        lines,
        l => l.category,
        (a, b) => ({ ...a, cost: a.cost + b.cost }),
    );
}

function mergeInterventions(interventions: BudgetIntervention[]) {
    return mergeByKey(
        interventions,
        i => `${i.type} - ${i.code}`,
        (a, b) => ({
            ...a,
            total_cost: a.total_cost + b.total_cost,
            cost_breakdown: mergeCostLines([
                ...(a.cost_breakdown ?? []),
                ...(b.cost_breakdown ?? []),
            ]),
        }),
    );
}

function mergeOrgUnits(orgUnits: BudgetOrgUnit[]) {
    return mergeByKey(
        orgUnits,
        ou => String(ou.org_unit_id),
        (a, b) => ({
            ...a,
            total_cost: a.total_cost + b.total_cost,
            interventions: mergeInterventions([
                ...(a.interventions ?? []),
                ...(b.interventions ?? []),
            ]),
        }),
    );
}

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
            selectedYear || yearOptions.length <= 2 // only one year in selection
                ? budgets.find(b => b.year === selectedYear)?.interventions
                : mergeInterventions(budgets.flatMap(b => b.interventions)),
        [budgets, yearOptions, selectedYear],
    );

    const sortedInterventionCosts = useMemo(() => {
        if (!interventionCosts) return [];

        return [...interventionCosts].sort(
            (a, b) => b.total_cost - a.total_cost,
        );
    }, [interventionCosts]);

    const orgUnitCosts = useMemo(
        () =>
            selectedYear || yearOptions.length <= 2 // only one year in selection
                ? budgets.find(b => b.year === selectedYear)?.org_units_costs
                : mergeOrgUnits(budgets.flatMap(b => b.org_units_costs)),
        [budgets, selectedYear, yearOptions],
    );

    const totalCost = useMemo(() => {
        if (!interventionCosts) return 0;

        return interventionCosts.reduce((sum, el) => sum + el.total_cost, 0);
    }, [interventionCosts]);

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
            {sortedInterventionCosts && (
                <>
                    <Grid item xs={12} md={7}>
                        <PaperContainer>
                            <CostBreakdownChart
                                interventionBudgets={sortedInterventionCosts}
                            />
                        </PaperContainer>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <PaperContainer>
                            <ProportionChart
                                interventionBudgets={sortedInterventionCosts}
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
