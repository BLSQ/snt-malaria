import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { InterventionCostCategory } from '../../planning/types/interventions';

export const useGetInterventionCostCategories = <
    T = InterventionCostCategory[],
>(
    selectFn?: (data: InterventionCostCategory[]) => T,
): UseQueryResult<T | InterventionCostCategory[], Error> => {
    return useSnackQuery({
        queryKey: ['interventionCostCategories'],
        queryFn: () =>
            getRequest('/api/snt_malaria/interventioncostcategories'),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
            select: (data: InterventionCostCategory[]) => {
                return selectFn ? selectFn(data) : data;
            },
        },
    });
};
