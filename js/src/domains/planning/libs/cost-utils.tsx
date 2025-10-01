import { Budget } from '../types/budget';

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

export const getCostBreakdownChartData = (interventionBudgets: any[]) => {
    return interventionBudgets
        ?.map((interventionBudget: any) => {
            // TODO Define what to do if not costbreakdown, hide from here, show as Other, ...
            return interventionBudget.costBreakdown?.reduce(
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

/////// DUMMY TO CLEAN WHEN WE CONNECT TO BUDGET API

const randomCategory = () => {
    const categories = [
        'Procurement',
        'Distribution',
        'Operational',
        'Supportive',
        'Other',
    ];
    return categories[Math.floor(Math.random() * categories.length)];
};

const generateCostBreakdown = (totalCost: number) => {
    // Split totalCost into 2-4 random parts, some with same category
    const breakdownCount = Math.floor(Math.random() * 3) + 2; // 2-4 items
    let remaining = totalCost;
    const breakdowns: { cost: number; category: string; name: string }[] = [];
    for (let i = 0; i < breakdownCount; i++) {
        const isLast = i === breakdownCount - 1;
        const cost = isLast
            ? remaining
            : Math.round(
                  (Math.random() * remaining * 0.7 + remaining * 0.1) * 100,
              ) / 100;
        const category = randomCategory();
        breakdowns.push({
            cost,
            category,
            name: `Breakdown ${i + 1}`,
        });
        remaining -= cost;
    }
    // If rounding errors, fix last item
    if (breakdowns.length > 0) {
        const sum = breakdowns.reduce((acc, b) => acc + b.cost, 0);
        const diff = Math.round((totalCost - sum) * 100) / 100;
        breakdowns[breakdowns.length - 1].cost += diff;
    }
    return breakdowns;
};

const interventionsData = [
    { name: 'ACTs', cost: 158898812.79 },
    { name: 'RDTs', cost: 120000000.12 },
    { name: 'MDA', cost: 98000000.55 },
    { name: 'PMC', cost: 158898812.79 },
    { name: 'SMC', cost: 158898812.79 },
    { name: 'RTS,S', cost: 158898812.79 },
    { name: 'IRS', cost: 50000000 },
    { name: 'Routine LLIN', cost: 75000000 },
    { name: 'Campaign LLIN', cost: 75000000 },
];

export const dummyBudget: { budgets: Budget[] } = {
    budgets: [
        {
            year: 2025,
            interventions: interventionsData.map(({ name, cost }) => ({
                name,
                cost,
                costBreakdown: cost > 0 ? generateCostBreakdown(cost) : [],
            })),
        },
    ],
};
