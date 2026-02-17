import { deleteRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MESSAGES } from '../../messages';

export const useDeleteScenarioRule = (scenarioId: number): UseMutationResult =>
    useSnackMutation({
        mutationFn: (ruleId: number) =>
            deleteRequest(`/api/snt_malaria/scenario_rules/${ruleId}/`),
        invalidateQueryKey: [
            'scenarioRules',
            `interventionAssignments_${scenarioId}`,
        ],
        snackSuccessMessage: MESSAGES.deleteScenarioRuleSuccess,
        snackErrorMsg: MESSAGES.deleteScenarioRuleError,
    });
