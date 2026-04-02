import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { makeUrlWithParams } from 'Iaso/libs/utils';
import { InterventionAssignmentResponse } from '../types/interventions';

export const useGetInterventionAssignments = (
    scenarioId: number | undefined,
): UseQueryResult<InterventionAssignmentResponse[], Error> => {
    const params: Record<string, any> = { scenario_id: scenarioId };
    const url = makeUrlWithParams(
        '/api/snt_malaria/intervention_assignments/',
        params,
    );

    return useSnackQuery({
        queryKey: [
            'interventionAssignments',
            `interventionAssignments_${scenarioId}`,
        ],
        queryFn: () => getRequest(url),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            refetchOnWindowFocus: false, // This is only needed with staleTime set
            cacheTime: Infinity, // disable auto fetch on cache expiration

            enabled: Boolean(scenarioId),
        },
    });
};
