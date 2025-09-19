import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { CostBreakdownLine } from '../types/CostBreakdownLine';

export const useGetCostBreakdownLines = <T = CostBreakdownLine[]>(
    intervention_id: number | undefined,
    selectFn?: (data: CostBreakdownLine[]) => T,
): UseQueryResult<T | CostBreakdownLine[], Error> => {
    return useSnackQuery({
        queryKey: ['costBreakdownLines', intervention_id],
        queryFn: () =>
            intervention_id
                ? getRequest(
                      `/api/snt_malaria/cost_breakdown_lines?intervention_id=${intervention_id}`,
                  )
                : [],
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
            select: (data: CostBreakdownLine[]) => {
                return selectFn ? selectFn(data) : data;
            },
        },
    });
};
