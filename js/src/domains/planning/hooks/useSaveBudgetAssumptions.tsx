import { UseMutationResult } from 'react-query';
import { postRequest } from 'Iaso/libs/Api';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { BudgetAssumptions as BudgetAssumptions } from '../types/interventions';

const transformPercentageValue = (value: number) => (value ?? 0) / 100;

const apiUrl = '/api/snt_malaria/budget_assumptions/many/';

export const useSaveBudgetAssumptions = (
    scenarioId: number,
): UseMutationResult<BudgetAssumptions[]> =>
    useSnackMutation({
        mutationFn: ({
            budgetAssumptions,
            interventionAssignmentIds,
        }: {
            budgetAssumptions: BudgetAssumptions[];
            interventionAssignmentIds: number[];
        }) =>
            postRequest(apiUrl, {
                budget_assumptions: budgetAssumptions.map(assumption => ({
                    ...assumption,
                    coverage: transformPercentageValue(assumption.coverage),
                })),
                intervention_assignments: interventionAssignmentIds,
                scenario: scenarioId,
            }),
        invalidateQueryKey: ['budgetAssumptions', scenarioId],
    });
