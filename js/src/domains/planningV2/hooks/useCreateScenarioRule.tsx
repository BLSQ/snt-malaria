import { postRequest, putRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import {
    InterventionProperties,
    MetricTypeCriterion,
} from '../types/scenarioRule';

type ScenarioRulePayload = {
    id?: number;
    name: string;
    scenario: number;
    metric_criteria: MetricTypeCriterion[];
    intervention_properties: InterventionProperties[];
};

export const useCreateScenarioRule = (scenarioId: number): UseMutationResult =>
    useSnackMutation({
        mutationFn: (body: ScenarioRulePayload) => {
            return body.id
                ? putRequest(
                      `/api/snt_malaria/scenario_rules/${body.id}/`,
                      body,
                  )
                : postRequest(`/api/snt_malaria/scenario_rules/`, body);
        },
        invalidateQueryKey: [
            'scenarioRules',
            `interventionAssignments_${scenarioId}`,
        ],
        showSuccessSnackBar: false,
    });
