import { BudgetIntervention } from '../types/budget';

export const INTERVENTION_COLORS = {
    ACTs: '#A2CAEA',
    RDTs: '#ACDF9B',
    MDA: '#D1C4E9',
    PMC: '#F2B16E',
    SMC: '#C54A53',
    'RTS,S': '#F2D683',
    IRS: '#E4754F',
    'Routine LLIN': '#80B3DC',
    'Campaign LLIN': '#6BD39D',
    IPTp: '#80B3DC',
};

export const getCostBreakdownChartData = (
    interventionBudgets: BudgetIntervention[],
) => {
    return interventionBudgets
        ?.map((interventionBudget: BudgetIntervention) => {
            // TODO Define what to do if not costbreakdown, hide from here, show as Other, ...
            return interventionBudget.cost_breakdown?.reduce(
                (acc, costLine) => {
                    return {
                        ...acc,
                        [costLine.category]:
                            (acc[costLine.category] ?? 0) + costLine.cost,
                    };
                },
                {
                    interventionName: interventionBudget.name,
                },
            );
        })
        .filter(Boolean);
};
