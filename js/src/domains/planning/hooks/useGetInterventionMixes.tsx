import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { makeUrlWithParams } from 'Iaso/libs/utils';
import { InterventionMix } from '../types/interventions';

export const useGetInterventionMixes = (
    scenarioId: number | undefined,
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
            enabled: Boolean(scenarioId),
            staleTime: 1000 * 60 * 15,
            cacheTime: 1000 * 60 * 5,
            select: (data: InterventionMix[]) => {
                return data;
            },
        },
    });
};
