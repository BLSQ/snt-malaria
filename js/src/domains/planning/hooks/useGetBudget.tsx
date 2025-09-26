import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { InterventionPlanMetrics } from '../types/budget';

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

const dummy = {
    budgets: {
        year: 2025,
        interventions: [
            {
                name: 'ACTs',
                cost: 158898812.78881973,
            },
            {
                name: 'RDTs',
                cost: 158898812.78881973,
            },
            {
                name: 'MDA',
                cost: 158898812.78881973,
            },
            {
                name: 'PMC',
                cost: 158898812.78881973,
            },
            {
                name: 'SMC',
                cost: 158898812.78881973,
            },
            {
                name: 'RTS,S',
                cost: 158898812.78881973,
            },
            {
                name: 'IRS',
                cost: 0,
            },
            {
                name: 'LLIN',
                cost: 0,
            },
        ],
    },
};

const mapToRequest = (interventionPlanMetrics: InterventionPlanMetrics[]) => {
    return {
        startYear: 2025,
        endYear: 2027,
        coverage: 1,
        is: interventionPlanMetrics.map(i => ({
            name: i.interventionId,
            type: i.metricType,
            places: i.orgUnits.map(ou => ou.name),
        })),
    };
};

export const useGetBudget = (
    interventionPlanMetrics: InterventionPlanMetrics[],
) => {
    return useSnackQuery({
        queryKey: ['budget'],
        queryFn: () => {
            return dummy;
        },
    });
};
