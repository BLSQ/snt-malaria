import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { InterventionCostLine } from '../../planning/types/interventions';

export const useGetInterventionCosts = <T = InterventionCostLine[]>(
    intervention_id: number | undefined,
    selectFn?: (data: InterventionCostLine[]) => T,
): UseQueryResult<T | InterventionCostLine[], Error> => {
    return useSnackQuery({
        queryKey: ['interventionCosts'],
        queryFn: () =>
            intervention_id
                ? getRequest(
                      `/api/snt_malaria/interventioncosts?intervention_id=${intervention_id}`,
                  )
                : [],
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
            select: (data: InterventionCostLine[]) => {
                return selectFn ? selectFn(data) : data;
            },
        },
    });
};
