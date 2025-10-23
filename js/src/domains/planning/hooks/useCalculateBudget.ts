import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import {
    BudgetCalculationRequest,
    BudgetCalculationResponse,
} from '../types/budget';

// TODO Let's see how to map this properly
const mapToRequest = (interventionPlanMetrics: BudgetCalculationRequest[]) => {
    return {
        startYear: 2025,
        endYear: 2027,
        coverage: 1,
        interventions: interventionPlanMetrics.map(i => ({
            name: i.interventionId,
            // type: i.metricType, // TODO: This is not clear what it should be
            places: i.orgUnits.map(ou => ou.name),
        })),
    };
};

export const postCalculateBudget = ({
    scenarioId,
    requestBody,
}: {
    scenarioId: number;
    requestBody: BudgetCalculationRequest[];
}): Promise<BudgetCalculationResponse> =>
    postRequest(`/api/snt_malaria/budgets/`, {
        scenario: scenarioId,
        intervention_plan_budget_requests: requestBody,
    });

export const useCalculateBudget = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: postCalculateBudget,
    });
