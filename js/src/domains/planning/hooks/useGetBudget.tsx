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
import { Budget, InterventionPlanBudgetRequest } from '../types/budget';
import { dummyBudget } from '../libs/cost-utils';
import { UseQueryResult } from 'react-query';

const mapToRequest = (
    interventionPlanMetrics: InterventionPlanBudgetRequest[],
) => {
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
    interventionPlanMetrics?: InterventionPlanBudgetRequest[],
): UseQueryResult<{ budgets: Budget[] }, Error> => {
    return useSnackQuery({
        queryKey: ['budget'],
        queryFn: () => {
            // TODO Type budget object.
            return new Promise((resolve, _reject) => {
                setTimeout(() => resolve(dummyBudget), 1000);
            });
        },
    });
};
