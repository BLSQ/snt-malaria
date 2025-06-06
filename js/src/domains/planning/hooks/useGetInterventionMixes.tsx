import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { makeUrlWithParams } from 'Iaso/libs/utils';
import { UseQueryResult } from 'react-query';
import { InterventionMix } from '../types/interventions';

export const useGetInterventionMixes = (
    scenarioId,
): UseQueryResult<InterventionMix[], Error> => {
    const params: Record<string, any> = {
        scenario_id: scenarioId,
    };
    const url = makeUrlWithParams(
        '/api/snt_malaria/interventionmixes/',
        params,
    );
    return useSnackQuery({
        queryKey: ['interventionMixes', scenarioId],
        queryFn: () => getRequest(url),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
            select: (data: InterventionMix[]) => {
                return data;
            },
        },
    });
};
