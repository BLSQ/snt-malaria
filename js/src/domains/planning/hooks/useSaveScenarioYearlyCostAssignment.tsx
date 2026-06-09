import { patchRequest, postRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';

type ScenarioYearlyCostAssignmentPayload = {
    id?: number;
    scenario: number;
    intervention?: number;
    year: number;
    value: number;
    costLine?: number;
};

const transformPercentageValue = (value: number) => (value ?? 0) / 100;

export const useSaveScenarioYearlyCostAssignment = (): UseMutationResult =>
    useSnackMutation({
        mutationFn: ({
            id,
            scenario,
            intervention,
            year,
            value,
            costLine,
        }: ScenarioYearlyCostAssignmentPayload) =>
            id
                ? patchRequest(
                      `/api/snt_malaria/scenario_yearly_cost_assignments/${id}/`,
                      {
                          scenario,
                          value: transformPercentageValue(value),
                      },
                  )
                : postRequest(
                      '/api/snt_malaria/scenario_yearly_cost_assignments/',
                      {
                          scenario,
                          intervention,
                          ...(costLine ? { cost_line: costLine } : {}),
                          year,
                          value: transformPercentageValue(value),
                      },
                  ),
        invalidateQueryKey: [
            'scenarioYearlyCostAssignments',
            'calculated_budget',
        ],
        showSuccessSnackBar: false,
    });
