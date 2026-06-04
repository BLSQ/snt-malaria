import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { ScenarioYearlyCostAssignment } from '../types/interventionAssignments';

const transformScenarioYearlyCostAssignment = (
    assignment: ScenarioYearlyCostAssignment,
) => ({
    ...assignment,
    value: Number(assignment.value) * 100,
});

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
            select: (data: ScenarioYearlyCostAssignment[]) =>
                data.map(transformScenarioYearlyCostAssignment),
        },
    });
};