import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { InterventionCostBreakdownLine } from '../types/InterventionCostBreakdownLine';

export const useGetInterventionCostBreakdownLines = <
    T = InterventionCostBreakdownLine[],
>(
    intervention_id: number | undefined,
    year: number,
    selectFn?: (data: InterventionCostBreakdownLine[]) => T,
): UseQueryResult<T | InterventionCostBreakdownLine[], Error> => {
    return useSnackQuery({
        queryKey: [`interventionCostBreakdownLines_${intervention_id}_${year}`],
        queryFn: () =>
            getRequest(
                `/api/snt_malaria/intervention_cost_breakdown_lines/?intervention_id=${intervention_id}&year=${year}`,
            ),
        options: {
            enabled: !!intervention_id,
            cacheTime: Infinity, // disable auto fetch on cache expiration
            staleTime: 1000 * 60 * 15, // in MS
            select: (data: InterventionCostBreakdownLine[]) => {
                return selectFn ? selectFn(data) : data;
            },
        },
    });
};
