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

export const getCostBreakdownChartData = (
    interventionBudgets: BudgetIntervention[],
) => {
    return interventionBudgets
        ?.map((interventionBudget: BudgetIntervention) => {
            return interventionBudget.cost_breakdown?.reduce(
                (acc, costLine) => {
                    return {
                        ...acc,
                        [costLine.category]:
                            (acc[costLine.category] ?? 0) + costLine.cost,
                    };
                },
                {
                    interventionType: interventionBudget.type,
                    interventionCode: interventionBudget.code,
                },
            );
        })
        .filter(Boolean);
};

export const formatPercentValue = (value: number) => {
    return `${(value * 100).toFixed(0)}%`;
};

export const formatBigNumber = (value: number) => {
    if (value >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(2)}B`;
    }
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
        return `${(value / 1_000).toFixed(2)}K`;
    }
    return value.toString();
};
