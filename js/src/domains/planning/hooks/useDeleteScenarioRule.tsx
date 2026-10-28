import { deleteRequest } from 'bluesquare-components';
import { UseMutationResult } from 'react-query';
import { useSnackMutation } from 'Iaso/libs/apiHooks';
import { MESSAGES } from '../../messages';
import { BUDGET_QUERY_KEYS } from '../../../constants/queryKeys';

export const useDeleteScenarioRule = (scenarioId: number): UseMutationResult =>
    useSnackMutation({
        mutationFn: (ruleId: number) =>
            deleteRequest(`/api/snt_malaria/scenario_rules/${ruleId}/`),
        invalidateQueryKey: [
            ...BUDGET_QUERY_KEYS,
            `scenarioRules_${scenarioId}`,
            'interventionAssignments',
            'impact',
        ],
        snackSuccessMessage: MESSAGES.deleteScenarioRuleSuccess,
        snackErrorMsg: MESSAGES.deleteScenarioRuleError,
    });
