import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { Scenario } from '../types';

export const useGetScenarios = (): UseQueryResult<Scenario[], Error> => {
    return useSnackQuery({
        queryKey: ['scenarios'],
        queryFn: () => getRequest('/api/snt_malaria/scenarios/'),
    });
};

export const useGetScenario = (
    scenarioId: number,
): UseQueryResult<Scenario, Error> => {
    return useSnackQuery({
        queryKey: [`scenario_${scenarioId}`],
        queryFn: () => getRequest(`/api/snt_malaria/scenarios/${scenarioId}/`),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
        },
    });
};
