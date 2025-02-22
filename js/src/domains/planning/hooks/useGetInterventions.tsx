import { UseQueryResult } from 'react-query';
import { getRequest } from 'Iaso/libs/Api';
import { useSnackQuery } from 'Iaso/libs/apiHooks';
import { InterventionCategory } from '../types/interventions';

export type DropdownOptions<T> = {
    label: string;
    value: T;
};

export const useGetInterventionCategories = (): UseQueryResult<
    InterventionCategory[],
    Error
> => {
    return useSnackQuery({
        queryKey: ['interventionCategories'],
        queryFn: () => getRequest('/api/snt_malaria/interventionCategory'),
        options: {
            staleTime: 1000 * 60 * 15, // in MS
            cacheTime: 1000 * 60 * 5,
            select: (data: InterventionCategory[]) => {
                return data;
            },
        },
    });
};
