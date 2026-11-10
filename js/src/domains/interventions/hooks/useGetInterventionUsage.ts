import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { InterventionUsageScenario } from '../types';

export const useGetInterventionUsage = (
    interventionId: number | undefined,
    enabled: boolean,
): UseQueryResult<InterventionUsageScenario[], Error> =>
    useSnackQuery({
        queryKey: ['interventionUsage', interventionId],
        queryFn: () =>
            getRequest(
                `/api/snt_malaria/interventions/${interventionId}/usage/`,
            ),
        options: {
            enabled: enabled && Boolean(interventionId),
            cacheTime: 0,
            staleTime: 0,
        },
    });
