import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { ScenarioYearlyCostAssignment } from '../types/interventionAssignments';

export const useGetScenarioYearlyCostAssignments = (
    scenarioId: number,
): UseQueryResult<ScenarioYearlyCostAssignment[], Error> => {
    return useSnackQuery({
        queryKey: [
            'scenarioYearlyCostAssignments',
            `scenarioYearlyCostAssignments_${scenarioId}`,
        ],
        queryFn: () =>
            getRequest(
                `/api/snt_malaria/scenario_yearly_cost_assignments/?scenario=${scenarioId}`,
            ),
        options: {
            cacheTime: Infinity,
            enabled: Boolean(scenarioId),
        },
    });
};
