import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { InterventionDetails } from '../../planning/types/interventions';

export const useGetInterventionDetails = ({
    interventionId,
}: {
    interventionId?: number;
}): UseQueryResult<InterventionDetails, Error> => {
    return useSnackQuery({
        queryKey: ['interventionDetails', interventionId],
        queryFn: () =>
            getRequest(
                `/api/snt_malaria/interventions/${interventionId}/details/`,
            ),
        options: {
            enabled: !!interventionId,
            cacheTime: Infinity, // disable auto fetch on cache expiration
        },
    });
};
