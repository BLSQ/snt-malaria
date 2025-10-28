import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';

export const useGetInterventionTotalCosts = (
    year: number,
): UseQueryResult<any, Error> => {
    return useSnackQuery({
        queryKey: [`interventionTotalCosts_${year}`],
        queryFn: () =>
            getRequest(
                `/api/snt_malaria/intervention_cost_breakdown_lines/get_sum_by_intervention/?year=${year}`,
            ),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
            select: (data: { intervention: number; total_cost: number }[]) => {
                return data.reduce(
                    (acc, curr) => {
                        acc[curr.intervention] = curr.total_cost;
                        return acc;
                    },
                    {} as Record<number, number>,
                );
            },
            enabled: !!year,
        },
    });
};
