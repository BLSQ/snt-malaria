import { formatCurrencyAmount } from 'bluesquare-components';
import { BudgetIntervention } from '../types/budget';

export const INTERVENTION_COLORS = {
    ACTs: '#A2CAEA',
    RDTs: '#ACDF9B',
    MDA: '#D1C4E9',
    PMC: '#F2B16E',
    SMC: '#C54A53',
    'RTS,S': '#F2D683',
    IRS: '#E4754F',
    'LLIN Routine': '#80B3DC',
    'LLIN Campaign': '#6BD39D',
    IPTp: '#80B3DC',
};

/**
 * Shapes intervention budgets into the row-per-intervention format the
 * (horizontal) cost-breakdown bar chart expects: one object per intervention
 * with a numeric value per cost category, keyed by category.
 */
export const getCostBreakdownChartData = (
    interventionBudgets: BudgetIntervention[],
) => {
    return interventionBudgets
        ?.map((interventionBudget: BudgetIntervention) =>
            interventionBudget.cost_breakdown?.reduce(
                (acc, costLine) => ({
                    ...acc,
                    [costLine.category]:
                        ((acc[costLine.category] as number) ?? 0) +
                        costLine.total_cost,
                }),
                {
                    interventionType: interventionBudget.type,
                    interventionCode: interventionBudget.code,
                } as Record<string, string | number>,
            ),
        )
        .filter(Boolean);
};

export const formatPercentValue = (value: number) => {
    return `${(value * 100).toFixed(0)}%`;
};

export const formatSignedPercentValue = (value: number) => {
    const pct = Math.round(value * 100);
    return `${pct > 0 ? '+' : ''}${pct}%`;
};

/** `value` as a percentage of `total`, or `undefined` when `total` is falsy. */
export const percentOfTotal = (
    value: number,
    total?: number,
): string | undefined =>
    total ? formatPercentValue(value / total) : undefined;

export const formatBigNumber = (value: number, currency?: string) => {
    const abs = Math.abs(value);
    const sign = value < 0 ? -1 : 1;

    let formattedValue;
    if (abs >= 1_000_000_000) {
        formattedValue = `${((abs / 1_000_000_000) * sign).toFixed(2)}B`;
    } else if (abs >= 1_000_000) {
        formattedValue = `${((abs / 1_000_000) * sign).toFixed(2)}M`;
    } else if (abs >= 1_000) {
        formattedValue = `${((abs / 1_000) * sign).toFixed(2)}K`;
    } else {
        formattedValue = value.toFixed(2);
    }
    return currency
        ? `${formatCurrencyAmount(formattedValue, currency)}`
        : formattedValue;
};

/** Compact quantity formatting: whole units below 1000, else K/M/B, e.g. 534233 -> "534.23K". */
export const formatQuantity = (value: number) =>
    Math.abs(value) >= 1_000
        ? formatBigNumber(value)
        : String(Math.round(value));
