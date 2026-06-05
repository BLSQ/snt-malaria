import { patchRequest, postRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

type ScenarioYearlyCostAssignmentPayload = {
    id?: number;
    scenario: number;
    year: number;
    value: number;
    costLine: number;
};

export const useSaveScenarioYearlyCostAssignment = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: ({
            id,
            scenario,
            year,
            value,
            costLine,
        }: ScenarioYearlyCostAssignmentPayload) =>
            id
                ? patchRequest(
                      `/api/snt_malaria/scenario_yearly_cost_assignments/${id}/`,
                      {
                          scenario,
                          value,
                      },
                  )
                : postRequest(
                      '/api/snt_malaria/scenario_yearly_cost_assignments/',
                      {
                          scenario,
                          cost_line: costLine,
                          year,
                          value,
                      },
                  ),
        invalidateQueryKey: [
            'scenarioYearlyCostAssignments',
            'calculated_budget',
        ],
        showSuccessSnackBar: false,
    });
