import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';

export const useGetScenarios = (): UseQueryResult<Scenario[], Error> => {
    return useSnackQuery({
        queryKey: ['scenarios'],
        queryFn: () => getRequest('/api/snt_malaria/scenarios/'),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
        },
    });
};
