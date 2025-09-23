import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { InterventionCostBreakdownLine } from '../types/InterventionCostBreakdownLine';

export const useGetInterventionCostBreakdownLines = <
    T = InterventionCostBreakdownLine[],
>(
    intervention_id: number | undefined,
    selectFn?: (data: InterventionCostBreakdownLine[]) => T,
): UseQueryResult<T | InterventionCostBreakdownLine[], Error> => {
    return useSnackQuery({
        queryKey: ['interventionCostBreakdownLines', intervention_id],
        queryFn: () =>
            intervention_id
                ? getRequest(
                      `/api/snt_malaria/intervention_cost_breakdown_lines?intervention_id=${intervention_id}`,
                  )
                : [],
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
            select: (data: InterventionCostBreakdownLine[]) => {
                return selectFn ? selectFn(data) : data;
            },
        },
    });
};
