/* TODO: Request
{
    "startYear": 2025,
    "endYear": 2027,
    "coverage": 1,
    "interventions": [
        {
            "name": "cm",
            "type": "cm",
            "places": [
                "Owerri West",
                ...
            ]
        },
    ]
}
*/

/* TODO: Response
{
    "budgets": [
        {
            "year": 2025,
            "interventions": [
                {
                    "name": "cm_public",
                    "cost": 158898812.78881973
                },
                ...
            ],
            "scenairo_name": ""
        },
        {
            "year": 2026,
            "interventions": [
                {
                    "name": "cm_public",
                    "cost": 158898812.78881973
                },
                ...
            ],
            "scenairo_name": ""
        },
        {
            "year": 2027,
            "interventions": [
                {
                    "name": "cm_public",
                    "cost": 158898812.78881973
                },
                ...
            ],
            "scenairo_name": ""
        }
    ]
} */

/**
 * Custom hook to fetch budget data for intervention plans.
 *
 * This hook simulates a budget API request and returns dummy data for the given intervention plan metrics.
 * The returned data structure contains a `budgets` object with the following shape:
 *
 * {
 *   budgets: {
 *     year: number,
 *     interventions: Array<{
 *       name: string,
 *       cost: number,
 *       costBreakdown: Array<{
 *         cost: number,
 *         category: string,
 *         name: string,
 *       }>
 *     }>
 *   }
 * }
 *
 * @param interventionPlanMetrics - Optional array of intervention plan metrics to map into the request format.
 * @returns An object containing budget data for the specified interventions and years.
 *
 * @remarks
 * The data structure returned by this hook is:
 * - budgets: {
 *     year: number,
 *     interventions: Array<{
 *       name: string,
 *       cost: number,
 *       costBreakdown: Array<{ cost: number, category: string, name: string }>
 *     }>
 *   }
 *
 * This is a mock implementation and should be replaced with a real API call.
 */
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { InterventionPlanMetrics } from '../types/budget';

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

const dummy = {
    budgets: {
        year: 2025,
        interventions: interventionsData.map(({ name, cost }) => ({
            name,
            cost,
            costBreakdown: cost > 0 ? generateCostBreakdown(cost) : [],
        })),
    },
};

const mapToRequest = (interventionPlanMetrics: InterventionPlanMetrics[]) => {
    return {
        startYear: 2025,
        endYear: 2027,
        coverage: 1,
        interventions: interventionPlanMetrics.map(i => ({
            name: i.interventionId,
            type: i.metricType, // TODO: This is not clear what it should be
            places: i.orgUnits.map(ou => ou.name),
        })),
    };
};

export const useGetBudget = (
    interventionPlanMetrics?: InterventionPlanMetrics[],
) => {
    return useSnackQuery({
        queryKey: ['budget'],
        queryFn: () => {
            // TODO Type budget object.
            return new Promise((resolve, reject) => {
                setTimeout(() => resolve(dummy), 1000);
            });
        },
    });
};
